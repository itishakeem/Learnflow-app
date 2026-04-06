import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from core.database import get_pool

router = APIRouter()
logger = logging.getLogger("progress")

# ── Event models (Dapr CloudEvent) ───────────────────────────────────────────

class CloudEvent(BaseModel):
    model_config = {"extra": "allow"}
    data: dict = {}


# ── Direct record models ──────────────────────────────────────────────────────

class ConceptRecord(BaseModel):
    user_id: str
    session_id: str
    concept: str
    level: str = "beginner"


class ExerciseRecord(BaseModel):
    user_id: str
    session_id: str
    topic: str
    level: str = "beginner"
    score: int | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "service": "progress-agent", "version": "1.0.0"}


@router.get("/dapr/subscribe")
def dapr_subscribe():
    return [
        {"pubsubname": "kafka-pubsub", "topic": "learning.concept.generated", "route": "/progress/events/concept-generated"},
        {"pubsubname": "kafka-pubsub", "topic": "learning.exercise.completed", "route": "/progress/events/exercise-completed"},
    ]


@router.post("/events/concept-generated", status_code=200)
async def on_concept_generated(event: CloudEvent):
    data = event.data
    user_id    = data.get("user_id", "unknown")
    session_id = data.get("session_id", "unknown")
    concept    = data.get("concept", "unknown")
    level      = data.get("level", "beginner")
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


@router.post("/events/exercise-completed", status_code=200)
async def on_exercise_completed(event: CloudEvent):
    data = event.data
    user_id    = data.get("user_id", "unknown")
    session_id = data.get("session_id", "unknown")
    topic      = data.get("topic", "unknown")
    level      = data.get("level", "beginner")
    score      = data.get("score")
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO exercise_completions (user_id, session_id, topic, level, score) VALUES ($1, $2, $3, $4, $5)",
                user_id, session_id, topic, level, score,
            )
        logger.info("Saved exercise completion user=%s topic=%r", user_id, topic)
    except HTTPException:
        return {"status": "RETRY"}
    except Exception as exc:
        logger.error("DB insert failed (exercise_completions): %s", exc)
        return {"status": "DROP"}
    return {"status": "SUCCESS"}


@router.post("/record/concept", status_code=200)
async def record_concept(req: ConceptRecord):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO concept_events (user_id, session_id, concept, level) VALUES ($1, $2, $3, $4)",
                req.user_id, req.session_id, req.concept, req.level,
            )
        logger.info("Recorded concept user=%s concept=%r", req.user_id, req.concept)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("DB insert failed (concept_events): %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@router.post("/record/exercise", status_code=200)
async def record_exercise(req: ExerciseRecord):
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO exercise_completions (user_id, session_id, topic, level, score) VALUES ($1, $2, $3, $4, $5)",
                req.user_id, req.session_id, req.topic, req.level, req.score,
            )
        logger.info("Recorded exercise user=%s topic=%r", req.user_id, req.topic)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("DB insert failed (exercise_completions): %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@router.get("/progress")
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
                "SELECT concept, level, received_at FROM concept_events WHERE user_id = $1 ORDER BY received_at DESC LIMIT 5",
                user_id,
            )
            recent_exercises = await conn.fetch(
                "SELECT topic, level, score, received_at FROM exercise_completions WHERE user_id = $1 ORDER BY received_at DESC LIMIT 5",
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
        "status":  "ok",
        "service": "progress-agent",
        "user_id": user_id,
        "summary": {
            "concepts_viewed":    concepts_count,
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
