import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("progress")

DATABASE_URL = os.getenv("DATABASE_URL", "")
PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")

db_pool: asyncpg.Pool | None = None


# ---------------------------------------------------------------------------
# URL helper — strip params asyncpg does not support (e.g. channel_binding)
# ---------------------------------------------------------------------------

def _clean_db_url(url: str) -> str:
    if "?" not in url:
        return url
    base, qs = url.split("?", 1)
    unsupported = {"channel_binding"}
    kept = [p for p in qs.split("&") if p.split("=")[0] not in unsupported]
    return f"{base}?{'&'.join(kept)}" if kept else base


# ---------------------------------------------------------------------------
# DB init
# ---------------------------------------------------------------------------

async def init_db(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS concept_events (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT NOT NULL,
                session_id  TEXT NOT NULL,
                concept     TEXT NOT NULL,
                level       TEXT,
                received_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS exercise_completions (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT NOT NULL,
                session_id  TEXT NOT NULL,
                topic       TEXT NOT NULL,
                level       TEXT,
                score       INTEGER,
                received_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_concept_user ON concept_events(user_id)"
        )
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_exercise_user ON exercise_completions(user_id)"
        )
    logger.info("Database tables initialised")


# ---------------------------------------------------------------------------
# App lifecycle — DB failure is non-fatal so the pod can pass its health check
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(
            _clean_db_url(DATABASE_URL), min_size=2, max_size=10
        )
        await init_db(db_pool)
        logger.info("Database pool ready")
    except Exception as exc:
        logger.error("DB connection failed at startup: %s — will retry on first request", exc)
    yield
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")


app = FastAPI(title="progress-agent", version="1.0.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Pool accessor — lazy connect if startup failed
# ---------------------------------------------------------------------------

async def get_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is not None:
        return db_pool
    try:
        db_pool = await asyncpg.create_pool(
            _clean_db_url(DATABASE_URL), min_size=2, max_size=10
        )
        await init_db(db_pool)
        logger.info("Database pool established on demand")
        return db_pool
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


# ---------------------------------------------------------------------------
# Dapr subscription declaration
# ---------------------------------------------------------------------------

@app.get("/dapr/subscribe")
def dapr_subscribe():
    return [
        {
            "pubsubname": PUBSUB_NAME,
            "topic": "learning.concept.generated",
            "route": "/events/concept-generated",
        },
        {
            "pubsubname": PUBSUB_NAME,
            "topic": "learning.exercise.completed",
            "route": "/events/exercise-completed",
        },
    ]


# ---------------------------------------------------------------------------
# Event models
# ---------------------------------------------------------------------------

class CloudEvent(BaseModel):
    model_config = {"extra": "allow"}
    data: dict = {}


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------

@app.post("/events/concept-generated", status_code=200)
async def on_concept_generated(event: CloudEvent):
    data = event.data
    user_id = data.get("user_id", "unknown")
    session_id = data.get("session_id", "unknown")
    concept = data.get("concept", "unknown")
    level = data.get("level", "beginner")

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO concept_events (user_id, session_id, concept, level) VALUES ($1, $2, $3, $4)",
                user_id, session_id, concept, level,
            )
        logger.info("Saved concept event user=%s concept=%r", user_id, concept)
    except HTTPException:
        return {"status": "RETRY"}
    except Exception as exc:
        logger.error("DB insert failed (concept_events): %s", exc)
        return {"status": "DROP"}

    return {"status": "SUCCESS"}


@app.post("/events/exercise-completed", status_code=200)
async def on_exercise_completed(event: CloudEvent):
    data = event.data
    user_id = data.get("user_id", "unknown")
    session_id = data.get("session_id", "unknown")
    topic = data.get("topic", "unknown")
    level = data.get("level", "beginner")
    score = data.get("score")

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO exercise_completions (user_id, session_id, topic, level, score) VALUES ($1, $2, $3, $4, $5)",
                user_id, session_id, topic, level, score,
            )
        logger.info("Saved exercise completion user=%s topic=%r score=%s", user_id, topic, score)
    except HTTPException:
        return {"status": "RETRY"}
    except Exception as exc:
        logger.error("DB insert failed (exercise_completions): %s", exc)
        return {"status": "DROP"}

    return {"status": "SUCCESS"}


# ---------------------------------------------------------------------------
# Progress query
# ---------------------------------------------------------------------------

@app.get("/progress")
async def get_progress(user_id: str = Query(..., description="Student user ID")):
    pool = await get_pool()

    try:
        async with pool.acquire() as conn:
            concepts_count = await conn.fetchval(
                "SELECT COUNT(*) FROM concept_events WHERE user_id = $1", user_id
            )
            exercises_count = await conn.fetchval(
                "SELECT COUNT(*) FROM exercise_completions WHERE user_id = $1", user_id
            )
            recent_concepts = await conn.fetch(
                """
                SELECT concept, level, received_at FROM concept_events
                WHERE user_id = $1 ORDER BY received_at DESC LIMIT 5
                """,
                user_id,
            )
            recent_exercises = await conn.fetch(
                """
                SELECT topic, level, score, received_at FROM exercise_completions
                WHERE user_id = $1 ORDER BY received_at DESC LIMIT 5
                """,
                user_id,
            )
            last_active = await conn.fetchval(
                """
                SELECT MAX(ts) FROM (
                    SELECT MAX(received_at) AS ts FROM concept_events WHERE user_id = $1
                    UNION ALL
                    SELECT MAX(received_at) AS ts FROM exercise_completions WHERE user_id = $1
                ) sub
                """,
                user_id,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("DB query failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database query failed") from exc

    return {
        "status": "ok",
        "service": "progress-agent",
        "user_id": user_id,
        "summary": {
            "concepts_viewed": concepts_count,
            "exercises_completed": exercises_count,
            "last_active": last_active.isoformat() if last_active else None,
        },
        "recent_concepts": [
            {"concept": r["concept"], "level": r["level"], "at": r["received_at"].isoformat()}
            for r in recent_concepts
        ],
        "recent_exercises": [
            {"topic": r["topic"], "level": r["level"], "score": r["score"], "at": r["received_at"].isoformat()}
            for r in recent_exercises
        ],
    }


# ---------------------------------------------------------------------------
# Health — always returns 200 even if DB is down, so the pod stays alive
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "progress-agent", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
