import json
import logging
import os
from datetime import datetime, timezone

from dapr.clients import DaprClient
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("triage")

app = FastAPI(title="triage", version="1.0.0")

PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME = os.getenv("TOPIC_NAME", "learning.events")


class InvokeRequest(BaseModel):
    user_id: str
    session_id: str
    code: str
    question: str | None = None


class TriageEvent(BaseModel):
    event_type: str = "triage.requested"
    user_id: str
    session_id: str
    payload: dict
    timestamp: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "triage", "version": "1.0.0"}


@app.post("/invoke")
async def invoke(request: InvokeRequest):
    """Triage an incoming learning request and publish an event to Kafka."""
    event = TriageEvent(
        user_id=request.user_id,
        session_id=request.session_id,
        payload=request.model_dump(),
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
            "Published triage event for user=%s session=%s",
            request.user_id,
            request.session_id,
        )
    except Exception as exc:
        logger.error("Failed to publish event: %s", exc)
        raise HTTPException(status_code=503, detail="Event publish failed") from exc

    return {"status": "accepted", "service": "triage", "session_id": request.session_id}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
