import json
import logging
import os
import socket
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("triage")

app = FastAPI(title="triage", version="1.0.0")

PUBSUB_NAME = os.getenv("PUBSUB_NAME", "kafka-pubsub")
TOPIC_NAME  = os.getenv("TOPIC_NAME", "learning.events")


class InvokeRequest(BaseModel):
    user_id: str
    session_id: str
    code: str
    question: str | None = None


def _dapr_available() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", 3500), timeout=0.5):
            return True
    except OSError:
        return False


def _publish_event(payload: dict) -> None:
    """Fire-and-forget publish — non-fatal if Dapr is unavailable."""
    if not _dapr_available():
        logger.debug("Dapr not available — skipping event publish")
        return
    try:
        from dapr.clients import DaprClient
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=PUBSUB_NAME,
                topic_name=TOPIC_NAME,
                data=json.dumps(payload),
                data_content_type="application/json",
            )
        logger.info("Published triage event user=%s", payload.get("user_id"))
    except Exception as exc:
        logger.warning("Failed to publish triage event (non-fatal): %s", exc)


@app.get("/health")
def health():
    return {"status": "ok", "service": "triage", "version": "1.0.0"}


@app.post("/invoke")
async def invoke(request: InvokeRequest):
    event_payload = {
        "event_type": "triage.requested",
        "user_id":    request.user_id,
        "session_id": request.session_id,
        "payload":    request.model_dump(),
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }
    await run_in_threadpool(_publish_event, event_payload)
    return {"status": "accepted", "service": "triage", "session_id": request.session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
