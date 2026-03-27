import json
import logging
import os
from datetime import datetime, timezone

import google.generativeai as genai
from dapr.clients import DaprClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("concepts")

app = FastAPI(title="concepts-agent", version="1.0.0")

PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME = os.getenv("TOPIC_NAME", "learning.concept.generated")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")

genai.configure(api_key=GEMINI_API_KEY)

LEVEL_DESCRIPTIONS = {
    "beginner": "a complete beginner with no prior knowledge",
    "intermediate": "someone with basic familiarity who wants to go deeper",
    "advanced": "an experienced practitioner looking for depth and nuance",
}


class ExplainRequest(BaseModel):
    concept: str
    user_id: str
    session_id: str
    context: str | None = None
    level: str = "beginner"


class ConceptEvent(BaseModel):
    event_type: str = "concept.generated"
    user_id: str
    session_id: str
    concept: str
    explanation: str
    level: str
    timestamp: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "concepts-agent", "version": "1.0.0"}


@app.post("/explain")
async def explain(request: ExplainRequest):
    """Generate a concept explanation via Gemini and publish the result to Kafka."""
    level = request.level if request.level in LEVEL_DESCRIPTIONS else "beginner"
    audience = LEVEL_DESCRIPTIONS[level]

    prompt = (
        "You are an expert educational tutor. Explain concepts clearly and concisely, "
        "using examples and analogies where helpful. Tailor depth and vocabulary to the "
        f"learner's level.\n\n"
        f"Explain the concept: '{request.concept}' to {audience}."
    )
    if request.context:
        prompt += f"\n\nAdditional context: {request.context}"

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(temperature=0.7),
        )
        response = await model.generate_content_async(prompt)
        explanation = response.text or ""
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Explanation generation failed") from exc

    event = ConceptEvent(
        user_id=request.user_id,
        session_id=request.session_id,
        concept=request.concept,
        explanation=explanation,
        level=level,
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
            "Published concept.generated for user=%s session=%s concept=%r",
            request.user_id,
            request.session_id,
            request.concept,
        )
    except Exception as exc:
        logger.error("Failed to publish event: %s", exc)
        raise HTTPException(status_code=503, detail="Event publish failed") from exc

    return {
        "status": "ok",
        "service": "concepts-agent",
        "session_id": request.session_id,
        "concept": request.concept,
        "explanation": explanation,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
