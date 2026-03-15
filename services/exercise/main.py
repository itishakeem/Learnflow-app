import json
import logging
import os
from datetime import datetime, timezone

import google.generativeai as genai
from dapr.clients import DaprClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("exercise")

app = FastAPI(title="exercise-agent", version="1.0.0")

PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME = os.getenv("TOPIC_NAME", "learning.exercise.generated")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

genai.configure(api_key=GEMINI_API_KEY)

LEVEL_DESCRIPTIONS = {
    "beginner": "a complete beginner with no prior programming knowledge",
    "intermediate": "someone comfortable with Python basics who wants to practise more",
    "advanced": "an experienced Python developer looking for a challenge",
}

SYSTEM_PROMPT = """You are an expert Python programming tutor who designs hands-on coding exercises.
Always respond with a single valid JSON object that has exactly these keys:
  title        – short exercise title (string)
  description  – clear problem statement with requirements (string)
  starter_code – Python code scaffold the student should complete (string)
  hints        – list of 2-3 progressive hints (array of strings)
  expected_output – example of what correct output looks like (string)
  difficulty   – one of: beginner | intermediate | advanced (string)
Do not include any text outside the JSON object."""


class GenerateRequest(BaseModel):
    topic: str
    user_id: str
    session_id: str
    level: str = "beginner"
    context: str | None = None


class Exercise(BaseModel):
    title: str
    description: str
    starter_code: str
    hints: list[str]
    expected_output: str
    difficulty: str


class ExerciseEvent(BaseModel):
    event_type: str = "exercise.generated"
    user_id: str
    session_id: str
    topic: str
    level: str
    exercise: dict
    timestamp: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "exercise-agent", "version": "1.0.0"}


@app.post("/generate")
async def generate(request: GenerateRequest):
    """Generate a coding exercise via Gemini and publish the result to Kafka."""
    level = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    audience = LEVEL_DESCRIPTIONS[level]

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Create a Python coding exercise about '{request.topic}' "
        f"suitable for {audience}."
    )
    if request.context:
        prompt += f"\n\nLearning context: {request.context}"

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(
                temperature=0.8,
                response_mime_type="application/json",
            ),
        )
        response = await model.generate_content_async(prompt)
        raw = response.text or "{}"
        exercise_data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse exercise JSON: %s", exc)
        raise HTTPException(status_code=502, detail="Invalid exercise format from model") from exc
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Exercise generation failed") from exc

    event = ExerciseEvent(
        user_id=request.user_id,
        session_id=request.session_id,
        topic=request.topic,
        level=level,
        exercise=exercise_data,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    try:
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=PUBSUB_NAME,
                topic_name=TOPIC_NAME,
                data=json.dumps(event.model_dump()),
                data_content_type="application/json",
            )
        logger.info(
            "Published exercise.generated for user=%s session=%s topic=%r",
            request.user_id,
            request.session_id,
            request.topic,
        )
    except Exception as exc:
        logger.error("Failed to publish event: %s", exc)
        raise HTTPException(status_code=503, detail="Event publish failed") from exc

    return {
        "status": "ok",
        "service": "exercise-agent",
        "session_id": request.session_id,
        "topic": request.topic,
        "exercise": exercise_data,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
