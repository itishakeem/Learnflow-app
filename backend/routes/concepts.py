import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from functools import lru_cache

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.config import GEMINI_API_KEY, GEMINI_MODEL, STREAM_TIMEOUT, PUBSUB_NAME, PROGRESS_URL
from utils.dapr import publish_event, record_direct

router = APIRouter()
logger = logging.getLogger("concepts")

genai.configure(api_key=GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(temperature=0.7),
    system_instruction=(
        "You are an expert educational tutor. Always respond in clean, professional Markdown. "
        "Structure your response EXACTLY as follows:\n\n"
        "# {Topic Title}\n\n"
        "## Introduction\n"
        "A clear, engaging introduction to the concept.\n\n"
        "## Key Concepts\n"
        "Bullet points covering the most important ideas.\n\n"
        "## Examples\n"
        "Concrete, practical examples with code blocks where relevant (use ```python fences).\n\n"
        "## Summary\n"
        "A concise recap of what was covered.\n\n"
        "Tailor depth and vocabulary to the learner's level. Be direct — no preamble."
    ),
)

LEVEL_DESCRIPTIONS = {
    "beginner":     "a complete beginner with no prior knowledge",
    "intermediate": "someone with basic familiarity who wants to go deeper",
    "advanced":     "an experienced practitioner looking for depth and nuance",
}

TOPIC_NAME = "learning.concept.generated"


@lru_cache(maxsize=256)
def _cached_explain(concept: str, level: str, context: str) -> str:
    audience = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["beginner"])
    prompt = f"Explain '{concept}' to {audience}."
    if context:
        prompt += f"\n\nAdditional context: {context}"
    response = _model.generate_content(prompt)
    return response.text or ""


def _record_concept(user_id: str, session_id: str, concept: str, level: str) -> None:
    record_direct(
        f"{PROGRESS_URL}/progress/record/concept",
        {"user_id": user_id, "session_id": session_id, "concept": concept, "level": level},
        label="concept",
    )


class ExplainRequest(BaseModel):
    concept: str
    user_id: str
    session_id: str
    context: str | None = None
    level: str = "beginner"


@router.get("/health")
def health():
    return {"status": "ok", "service": "concepts-agent", "version": "1.0.0"}


@router.post("/explain/stream")
async def explain_stream(request: ExplainRequest):
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
                    yield f"data: {json.dumps({'chunk': text})}\n\n"
                    await asyncio.sleep(0)

            elapsed = time.perf_counter() - t0
            logger.info("concepts stream complete concept=%r level=%s elapsed=%.2fs chars=%d",
                        concept, level, elapsed, sum(len(t) for t in full_text))

            event_payload = {
                "event_type":  "concept.generated",
                "user_id":     request.user_id,
                "session_id":  request.session_id,
                "concept":     concept,
                "explanation": "".join(full_text),
                "level":       level,
                "timestamp":   datetime.now(timezone.utc).isoformat(),
            }
            asyncio.create_task(run_in_threadpool(publish_event, PUBSUB_NAME, TOPIC_NAME, event_payload))
            asyncio.create_task(run_in_threadpool(_record_concept, request.user_id, request.session_id, concept, level))

            yield f"data: {json.dumps({'done': True, 'session_id': request.session_id, 'concept': concept})}\n\n"

        except asyncio.TimeoutError:
            logger.warning("concepts stream timed out concept=%r", concept)
            yield f"data: {json.dumps({'error': 'Request timed out. Please try again.', 'done': True})}\n\n"
        except Exception as exc:
            logger.error("concepts stream error concept=%r: %s", concept, exc)
            yield f"data: {json.dumps({'error': 'Explanation generation failed. Please try again.', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/explain")
async def explain(request: ExplainRequest):
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
    asyncio.create_task(run_in_threadpool(publish_event, PUBSUB_NAME, TOPIC_NAME, event_payload))
    asyncio.create_task(run_in_threadpool(_record_concept, request.user_id, request.session_id, request.concept.strip(), level))

    return {
        "status":      "ok",
        "service":     "concepts-agent",
        "session_id":  request.session_id,
        "concept":     request.concept,
        "explanation": explanation,
    }
