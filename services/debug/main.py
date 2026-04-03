import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("debug")

app = FastAPI(title="debug-agent", version="1.0.0")

PUBSUB_NAME    = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME     = os.getenv("TOPIC_NAME", "code.debug.analysis")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
STREAM_TIMEOUT = int(os.getenv("STREAM_TIMEOUT", "15"))

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


def _analyze_code(language: str, code: str, error: str) -> dict:
    """Synchronous Gemini call — run in threadpool."""
    prompt = (
        f"Language: {language}\n\n"
        f"Code:\n```{language}\n{code}\n```\n\n"
        f"Error:\n{error}"
    )
    response = _model.generate_content(prompt)
    return json.loads(response.text or "{}")


def _publish_event(payload: dict) -> None:
    try:
        from dapr.clients import DaprClient
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=PUBSUB_NAME,
                topic_name=TOPIC_NAME,
                data=json.dumps(payload),
                data_content_type="application/json",
            )
        logger.info("Published code.debug.analysis")
    except Exception as exc:
        logger.warning("Failed to publish event (non-fatal): %s", exc)


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


@app.get("/health")
def health():
    return {"status": "ok", "service": "debug-agent", "version": "1.0.0"}


@app.post("/debug")
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
    asyncio.create_task(run_in_threadpool(_publish_event, event_payload))

    return {
        "status":     "ok",
        "service":    "debug-agent",
        "session_id": request.session_id,
        "language":   request.language,
        "analysis":   analysis_data,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
