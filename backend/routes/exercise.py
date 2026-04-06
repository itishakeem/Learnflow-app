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
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from core.config import GEMINI_API_KEY, GEMINI_MODEL, STREAM_TIMEOUT, PUBSUB_NAME, PROGRESS_URL
from utils.dapr import publish_event, record_direct

router = APIRouter()
logger = logging.getLogger("exercise")

genai.configure(api_key=GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name=GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(
        temperature=0.8,
        response_mime_type="application/json",
    ),
    system_instruction=(
        "You are an expert Python programming tutor who designs hands-on coding exercises. "
        "Respond with a single valid JSON object with exactly these keys:\n"
        "- title (string): exercise title\n"
        "- description (string): full exercise description written in Markdown with this structure:\n"
        "  ## Objective\n  What the student will build or solve.\n\n"
        "  ## Requirements\n  Bullet list of specific requirements.\n\n"
        "  ## Beginner Challenge\n  A simpler version or warm-up task.\n\n"
        "  ## Intermediate Challenge\n  The main task.\n\n"
        "  ## Advanced Challenge\n  An extension for extra credit.\n\n"
        "  ## Expected Output\n  Example of what the final output should look like.\n"
        "- starter_code (string): Python starter code scaffold with comments\n"
        "- hints (array of 2-3 strings): progressive hints\n"
        "- expected_output (string): sample output\n"
        "- difficulty (string): one of beginner/intermediate/advanced\n"
        "- solution (string): complete working Python solution with comments\n\n"
        "No text outside the JSON."
    ),
)

LEVEL_DESCRIPTIONS = {
    "beginner":     "a complete beginner with no prior programming knowledge",
    "intermediate": "someone comfortable with Python basics",
    "advanced":     "an experienced Python developer looking for a challenge",
}

TOPIC_NAME = "learning.exercise.generated"

MAX_CODE_LENGTH  = 10_000
EXECUTION_TIMEOUT = 10


def _generate_exercise(topic: str, level: str, context: str) -> dict:
    audience = LEVEL_DESCRIPTIONS.get(level, LEVEL_DESCRIPTIONS["beginner"])
    prompt = f"Create a Python exercise about '{topic}' for {audience}."
    if context:
        prompt += f"\n\nContext: {context}"
    response = _model.generate_content(prompt)
    return json.loads(response.text or "{}")


def _record_exercise(user_id: str, session_id: str, topic: str, level: str) -> None:
    record_direct(
        f"{PROGRESS_URL}/progress/record/exercise",
        {"user_id": user_id, "session_id": session_id, "topic": topic, "level": level, "score": None},
        label="exercise",
    )


def _execute_code(code: str) -> dict:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmp_path = f.name
    try:
        result = subprocess.run(
            [sys.executable, tmp_path],
            capture_output=True, text=True, timeout=EXECUTION_TIMEOUT,
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


class GenerateRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    level: str = "beginner"
    context: str | None = None


class RunRequest(BaseModel):
    code: str


@router.get("/health")
def health():
    return {"status": "ok", "service": "exercise-agent", "version": "1.0.0"}


@router.post("/generate")
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
    asyncio.create_task(run_in_threadpool(publish_event, PUBSUB_NAME, TOPIC_NAME, event_payload))
    asyncio.create_task(run_in_threadpool(_record_exercise, request.user_id, request.session_id, request.topic.strip(), level))

    return {
        "status":     "ok",
        "service":    "exercise-agent",
        "session_id": request.session_id,
        "topic":      request.topic,
        "exercise":   exercise_data,
    }


@router.post("/run")
async def run_code(request: RunRequest):
    if len(request.code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Code exceeds {MAX_CODE_LENGTH} character limit")

    t0 = time.perf_counter()
    result = await run_in_threadpool(_execute_code, request.code)
    elapsed = time.perf_counter() - t0
    logger.info("code run exit_code=%d timed_out=%s elapsed=%.2fs",
                result["exit_code"], result["timed_out"], elapsed)

    return {
        "status":    "ok",
        "service":   "exercise-agent",
        "stdout":    result["stdout"],
        "stderr":    result["stderr"],
        "exit_code": result["exit_code"],
        "timed_out": result["timed_out"],
    }
