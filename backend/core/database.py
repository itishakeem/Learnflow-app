import logging
import asyncpg
from fastapi import HTTPException
from core.config import DATABASE_URL

logger = logging.getLogger("db")

_pool: asyncpg.Pool | None = None


def _clean_db_url(url: str) -> str:
    """Strip query params asyncpg does not support (e.g. channel_binding)."""
    if "?" not in url:
        return url
    base, qs = url.split("?", 1)
    unsupported = {"channel_binding"}
    kept = [p for p in qs.split("&") if p.split("=")[0] not in unsupported]
    return f"{base}?{'&'.join(kept)}" if kept else base


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        _pool = await asyncpg.create_pool(
            _clean_db_url(DATABASE_URL), min_size=2, max_size=10
        )
        logger.info("Database pool created")
        return _pool
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


async def init_db() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Auth table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                password_hash   TEXT,
                provider        TEXT NOT NULL DEFAULT 'local',
                avatar_url      TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """)
        # Progress tables
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS concept_events (
                id          SERIAL PRIMARY KEY,
                user_id     TEXT NOT NULL,
                session_id  TEXT NOT NULL,
                concept     TEXT NOT NULL,
                level       TEXT,
                received_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_concept_user ON concept_events(user_id);
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
            );
            CREATE INDEX IF NOT EXISTS idx_exercise_user ON exercise_completions(user_id);
        """)
    logger.info("Database tables initialised")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")
