import json
import logging
import os
from datetime import datetime, timezone
from functools import lru_cache

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concepts")

app = FastAPI(title="concepts-agent", version="1.0.0")

PUBSUB_NAME   = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME    = os.getenv("TOPIC_NAME", "learning.concept.generated")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

genai.configure(api_key=GEMINI_API_KEY)

# ── Model singleton — created once at startup ─────────────────────────────────
_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(temperature=0.7),
    system_instruction=(
        "You are an expert educational tutor. Explain concepts clearly and concisely, "
        "using examples and analogies where helpful. Tailor depth and vocabulary to the "
        "learner's level. Be direct — skip preamble, start the explanation immediately."
    ),
)

LEVEL_DESCRIPTIONS = {
    "beginner":     "a complete beginner with no prior knowledge",
    "intermediate": "someone with basic familiarity who wants to go deeper",
    "advanced":     "an experienced practitioner looking for depth and nuance",
}

# ── In-process LRU cache (concept + level key, max 256 entries) ───────────────
@lru_cache(maxsize=256)
def _cached_explain(concept: str, level: str, context: str) -> str:
    """Synchronous Gemini call — run in threadpool so we don't block the event loop."""
    audience = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["beginner"])
    prompt = f"Explain '{concept}' to {audience}."
    if context:
        prompt += f"\n\nAdditional context: {context}"
    response = _model.generate_content(prompt)
    return response.text or ""


def _publish_event(payload: dict) -> None:
    """Fire-and-forget Dapr publish — failures are non-fatal."""
    try:
        from dapr.clients import DaprClient
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=PUBSUB_NAME,
                topic_name=TOPIC_NAME,
                data=json.dumps(payload),
                data_content_type="application/json",
            )
        logger.info("Published concept.generated concept=%r", payload.get("concept"))
    except Exception as exc:
        logger.warning("Failed to publish event (non-fatal): %s", exc)


class ExplainRequest(BaseModel):
    concept: str
    user_id: str
    session_id: str
    context: str | None = None
    level: str = "beginner"


@app.get("/health")
def health():
    return {"status": "ok", "service": "concepts-agent", "version": "1.0.0"}


@app.post("/explain")
async def explain(request: ExplainRequest):
    level   = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    context = (request.context or "").strip()

    try:
        # Run cached/synchronous Gemini call in threadpool to keep async loop free
        explanation = await run_in_threadpool(
            _cached_explain, request.concept.strip().lower(), level, context
        )
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Explanation generation failed") from exc

    # Publish event asynchronously — do not await, never blocks the response
    event_payload = {
        "event_type": "concept.generated",
        "user_id":    request.user_id,
        "session_id": request.session_id,
        "concept":    request.concept,
        "explanation": explanation,
        "level":      level,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }
    await run_in_threadpool(_publish_event, event_payload)

    return {
        "status":      "ok",
        "service":     "concepts-agent",
        "session_id":  request.session_id,
        "concept":     request.concept,
        "explanation": explanation,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
