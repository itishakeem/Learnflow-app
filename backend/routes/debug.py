import asyncio
import json
import logging
import time
from datetime import datetime, timezone

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from core.config import GEMINI_API_KEY, GEMINI_MODEL, STREAM_TIMEOUT, PUBSUB_NAME
from utils.dapr import publish_event

router = APIRouter()
logger = logging.getLogger("debug")

genai.configure(api_key=GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(
        temperature=0.2,
        response_mime_type="application/json",
    ),
    system_instruction=(
        "You are an expert programming debugger. Analyse code and errors, then respond "
        "with a single valid JSON object containing exactly: root_cause (string), "
        "explanation (string), fix (string), corrected_code (string), "
        "key_concepts (array of strings). No text outside the JSON."
    ),
)

TOPIC_NAME = "code.debug.analysis"


def _analyze_code(language: str, code: str, error: str) -> dict:
    prompt = (
        f"Language: {language}\n\n"
        f"Code:\n```{language}\n{code}\n```\n\n"
        f"Error:\n{error}"
    )
    response = _model.generate_content(prompt)
    return json.loads(response.text or "{}")


class DebugRequest(BaseModel):
    code: str
    error: str
    user_id: str
    session_id: str
    language: str = "python"


class DebugAnalysis(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    corrected_code: str
    key_concepts: list[str]


@router.get("/health")
def health():
    return {"status": "ok", "service": "debug-agent", "version": "1.0.0"}


@router.post("/debug")
async def debug(request: DebugRequest):
    t0 = time.perf_counter()
    try:
        analysis_data = await asyncio.wait_for(
            run_in_threadpool(_analyze_code, request.language, request.code, request.error),
            timeout=STREAM_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.warning("debug analyze timed out language=%r", request.language)
        raise HTTPException(status_code=504, detail="Debug analysis timed out — please try again")
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse analysis JSON: %s", exc)
        raise HTTPException(status_code=502, detail="Invalid analysis format from model") from exc
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Debug analysis failed") from exc

    elapsed = time.perf_counter() - t0
    logger.info("debug analyze language=%r elapsed=%.2fs", request.language, elapsed)

    event_payload = {
        "event_type": "code.debug.analysis",
        "user_id":    request.user_id,
        "session_id": request.session_id,
        "language":   request.language,
        "analysis":   analysis_data,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }
    asyncio.create_task(run_in_threadpool(publish_event, PUBSUB_NAME, TOPIC_NAME, event_payload))

    return {
        "status":     "ok",
        "service":    "debug-agent",
        "session_id": request.session_id,
        "language":   request.language,
        "analysis":   analysis_data,
    }
