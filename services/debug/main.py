import json
import logging
import os
from datetime import datetime, timezone

import google.generativeai as genai
from dapr.clients import DaprClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("debug")

app = FastAPI(title="debug-agent", version="1.0.0")

PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME = os.getenv("TOPIC_NAME", "code.debug.analysis")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")

genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are an expert programming tutor specialising in debugging code.
Analyse the provided code and error, then respond with a single valid JSON object
containing exactly these keys:
  root_cause     – one-sentence summary of why the error occurred (string)
  explanation    – detailed explanation of the bug and how it manifests (string)
  fix            – step-by-step instructions to fix the problem (string)
  corrected_code – the complete corrected version of the code (string)
  key_concepts   – list of programming concepts the student should review (array of strings)
Do not include any text outside the JSON object."""


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


class DebugEvent(BaseModel):
    event_type: str = "code.debug.analysis"
    user_id: str
    session_id: str
    language: str
    analysis: dict
    timestamp: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "debug-agent", "version": "1.0.0"}


@app.post("/debug")
async def debug(request: DebugRequest):
    """Analyse a code error via Gemini and publish the result to Kafka."""
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Language: {request.language}\n\n"
        f"Code:\n```{request.language}\n{request.code}\n```\n\n"
        f"Error:\n{request.error}"
    )

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        response = await model.generate_content_async(prompt)
        raw = response.text or "{}"
        analysis_data = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse analysis JSON: %s", exc)
        raise HTTPException(status_code=502, detail="Invalid analysis format from model") from exc
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Debug analysis failed") from exc

    event = DebugEvent(
        user_id=request.user_id,
        session_id=request.session_id,
        language=request.language,
        analysis=analysis_data,
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
            "Published code.debug.analysis for user=%s session=%s",
            request.user_id,
            request.session_id,
        )
    except Exception as exc:
        logger.error("Failed to publish event: %s", exc)
        raise HTTPException(status_code=503, detail="Event publish failed") from exc

    return {
        "status": "ok",
        "service": "debug-agent",
        "session_id": request.session_id,
        "language": request.language,
        "analysis": analysis_data,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
