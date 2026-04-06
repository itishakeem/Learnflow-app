"""
LearnFlow — Unified FastAPI Backend
====================================
All microservices merged into a single app for Render deployment.

Routers:
  /auth      — signup, login, OAuth (Google + GitHub), JWT verify, delete account
  /concepts  — AI concept explanations (streaming + non-streaming)
  /exercise  — AI exercise generation + code runner
  /debug     — AI code debugger
  /triage    — event triage / pub-sub relay
  /progress  — activity tracking, progress queries

Start command (Render):
  uvicorn main:app --host 0.0.0.0 --port 10000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from core.config import SESSION_SECRET, FRONTEND_URL
from core.database import init_db, close_pool
from routes import auth, concepts, debug, exercise, progress, triage

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("main")

# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LearnFlow backend starting up…")
    try:
        await init_db()
        logger.info("Database ready")
    except Exception as exc:
        logger.warning("DB init failed at startup (will retry on first request): %s", exc)
    yield
    await close_pool()
    logger.info("LearnFlow backend shut down")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LearnFlow API",
    version="1.0.0",
    description="AI-powered learning platform — concepts, exercises, debugging, progress tracking",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Tighten to FRONTEND_URL in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Required by authlib for OAuth state storage
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    https_only=False,   # Set True when behind HTTPS on Render
    same_site="lax",
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router,     prefix="/auth",     tags=["Auth"])
app.include_router(concepts.router, prefix="/concepts",  tags=["Concepts"])
app.include_router(exercise.router, prefix="/exercise",  tags=["Exercise"])
app.include_router(debug.router,    prefix="/debug",     tags=["Debug"])
app.include_router(triage.router,   prefix="/triage",    tags=["Triage"])
app.include_router(progress.router, prefix="/progress",  tags=["Progress"])

# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "LearnFlow API",
        "version": "1.0.0",
        "status":  "ok",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Root"])
def health():
    return {"status": "ok", "service": "learnflow-backend"}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=10000, reload=False)
