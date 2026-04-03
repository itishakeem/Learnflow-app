import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from functools import lru_cache

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("concepts")

app = FastAPI(title="concepts-agent", version="1.0.0")

PUBSUB_NAME    = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME     = os.getenv("TOPIC_NAME", "learning.concept.generated")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
STREAM_TIMEOUT = int(os.getenv("STREAM_TIMEOUT", "15"))   # seconds

genai.configure(api_key=GEMINI_API_KEY)

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

# ── LRU cache for non-streaming fallback ──────────────────────────────────────
@lru_cache(maxsize=256)
def _cached_explain(concept: str, level: str, context: str) -> str:
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


@app.post("/explain/stream")
async def explain_stream(request: ExplainRequest):
    """
    Streaming endpoint — sends text chunks as SSE (text/event-stream).
    The frontend reads these chunks and renders them progressively.
    """
    level   = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    context = (request.context or "").strip()
    concept = request.concept.strip()

    audience = LEVEL_DESCRIPTIONS[level]
    prompt = f"Explain '{concept}' to {audience}."
    if context:
        prompt += f"\n\nAdditional context: {context}"

    t0 = time.perf_counter()

    async def generate():
        full_text = []
        try:
            # Use the sync streaming API in a thread to avoid blocking
            def _stream():
                return _model.generate_content(prompt, stream=True)

            stream = await asyncio.wait_for(
                run_in_threadpool(_stream),
                timeout=STREAM_TIMEOUT,
            )

            for chunk in stream:
                text = chunk.text or ""
                if text:
                    full_text.append(text)
                    # SSE format: "data: <chunk>\n\n"
                    yield f"data: {json.dumps({'chunk': text})}\n\n"
                    await asyncio.sleep(0)   # yield control to event loop

            elapsed = time.perf_counter() - t0
            logger.info(
                "concepts stream complete concept=%r level=%s elapsed=%.2fs chars=%d",
                concept, level, elapsed, sum(len(t) for t in full_text),
            )

            # Fire-and-forget pub/sub after streaming completes
            event_payload = {
                "event_type":  "concept.generated",
                "user_id":     request.user_id,
                "session_id":  request.session_id,
                "concept":     concept,
                "explanation": "".join(full_text),
                "level":       level,
                "timestamp":   datetime.now(timezone.utc).isoformat(),
            }
            asyncio.create_task(run_in_threadpool(_publish_event, event_payload))

            # Signal completion with metadata
            yield f"data: {json.dumps({'done': True, 'session_id': request.session_id, 'concept': concept})}\n\n"

        except asyncio.TimeoutError:
            elapsed = time.perf_counter() - t0
            logger.warning("concepts stream timed out concept=%r elapsed=%.2fs", concept, elapsed)
            yield f"data: {json.dumps({'error': 'Request timed out. Please try again.', 'done': True})}\n\n"
        except Exception as exc:
            logger.error("concepts stream error concept=%r: %s", concept, exc)
            yield f"data: {json.dumps({'error': 'Explanation generation failed. Please try again.', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/explain")
async def explain(request: ExplainRequest):
    """Non-streaming fallback endpoint."""
    level   = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    context = (request.context or "").strip()

    t0 = time.perf_counter()
    try:
        explanation = await asyncio.wait_for(
            run_in_threadpool(_cached_explain, request.concept.strip().lower(), level, context),
            timeout=STREAM_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Explanation timed out — please try again")
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Explanation generation failed") from exc

    elapsed = time.perf_counter() - t0
    logger.info("concepts explain concept=%r level=%s elapsed=%.2fs", request.concept, level, elapsed)

    event_payload = {
        "event_type":  "concept.generated",
        "user_id":     request.user_id,
        "session_id":  request.session_id,
        "concept":     request.concept,
        "explanation": explanation,
        "level":       level,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }
    asyncio.create_task(run_in_threadpool(_publish_event, event_payload))

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
