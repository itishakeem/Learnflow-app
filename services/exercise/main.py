import asyncio
import json
import logging
import os
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger("exercise")

app = FastAPI(title="exercise-agent", version="1.0.0")

PUBSUB_NAME    = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME     = os.getenv("TOPIC_NAME", "learning.exercise.generated")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
STREAM_TIMEOUT = int(os.getenv("STREAM_TIMEOUT", "20"))

genai.configure(api_key=GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(
        temperature=0.8,
        response_mime_type="application/json",
    ),
    system_instruction=(
        "You are an expert Python programming tutor who designs hands-on coding exercises. "
        "Respond with a single valid JSON object with exactly these keys: "
        "title (string), description (string), starter_code (string), "
        "hints (array of 2-3 strings), expected_output (string), difficulty (string). "
        "No text outside the JSON."
    ),
)

LEVEL_DESCRIPTIONS = {
    "beginner":     "a complete beginner with no prior programming knowledge",
    "intermediate": "someone comfortable with Python basics",
    "advanced":     "an experienced Python developer looking for a challenge",
}


def _generate_exercise(topic: str, level: str, context: str) -> dict:
    """Synchronous Gemini call — run in threadpool."""
    audience = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["beginner"])
    prompt = f"Create a Python exercise about '{topic}' for {audience}."
    if context:
        prompt += f"\n\nContext: {context}"
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
        logger.info("Published exercise.generated topic=%r", payload.get("topic"))
    except Exception as exc:
        logger.warning("Failed to publish event (non-fatal): %s", exc)


class GenerateRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    level: str = "beginner"
    context: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "exercise-agent", "version": "1.0.0"}


@app.post("/generate")
async def generate(request: GenerateRequest):
    level   = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    context = (request.context or "").strip()

    t0 = time.perf_counter()
    try:
        exercise_data = await asyncio.wait_for(
            run_in_threadpool(_generate_exercise, request.topic.strip(), level, context),
            timeout=STREAM_TIMEOUT,
        )
    except asyncio.TimeoutError:
        logger.warning("exercise generate timed out topic=%r", request.topic)
        raise HTTPException(status_code=504, detail="Exercise generation timed out — please try again")
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse exercise JSON: %s", exc)
        raise HTTPException(status_code=502, detail="Invalid exercise format from model") from exc
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Exercise generation failed") from exc

    elapsed = time.perf_counter() - t0
    logger.info("exercise generate topic=%r level=%s elapsed=%.2fs", request.topic, level, elapsed)

    event_payload = {
        "event_type": "exercise.generated",
        "user_id":    request.user_id,
        "session_id": request.session_id,
        "topic":      request.topic,
        "level":      level,
        "exercise":   exercise_data,
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }
    asyncio.create_task(run_in_threadpool(_publish_event, event_payload))

    return {
        "status":     "ok",
        "service":    "exercise-agent",
        "session_id": request.session_id,
        "topic":      request.topic,
        "exercise":   exercise_data,
    }


# ── Run Python code ───────────────────────────────────────────────────────────

MAX_CODE_LENGTH = 10_000
EXECUTION_TIMEOUT = 10


class RunRequest(BaseModel):
    code: str


def _execute_code(code: str) -> dict:
    """Write code to a temp file and run it in a subprocess with a timeout."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT,
        )
        return {
            "stdout":    result.stdout,
            "stderr":    result.stderr,
            "exit_code": result.returncode,
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout":    "",
            "stderr":    f"Execution timed out after {EXECUTION_TIMEOUT} seconds.",
            "exit_code": 1,
            "timed_out": True,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/run")
async def run_code(request: RunRequest):
    if len(request.code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Code exceeds {MAX_CODE_LENGTH} character limit")

    t0 = time.perf_counter()
    result = await run_in_threadpool(_execute_code, request.code)
    elapsed = time.perf_counter() - t0
    logger.info("code run exit_code=%d timed_out=%s elapsed=%.2fs", result["exit_code"], result["timed_out"], elapsed)

    return {
        "status":    "ok",
        "service":   "exercise-agent",
        "stdout":    result["stdout"],
        "stderr":    result["stderr"],
        "exit_code": result["exit_code"],
        "timed_out": result["timed_out"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
