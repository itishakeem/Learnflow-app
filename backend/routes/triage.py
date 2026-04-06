import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from core.config import PUBSUB_NAME
from utils.dapr import publish_event

router = APIRouter()
logger = logging.getLogger("triage")

TOPIC_NAME = "learning.events"


class InvokeRequest(BaseModel):
    user_id: str
    session_id: str
    code: str
    question: str | None = None


@router.get("/health")
def health():
    return {"status": "ok", "service": "triage", "version": "1.0.0"}


@router.post("/invoke")
async def invoke(request: InvokeRequest):
    event_payload = {
        "event_type": "triage.requested",
        "user_id":    request.user_id,
        "session_id": request.session_id,
        "payload":    request.model_dump(),
        "timestamp":  datetime.now(timezone.utc).isoformat(),
    }
    await run_in_threadpool(publish_event, PUBSUB_NAME, TOPIC_NAME, event_payload)
    return {"status": "accepted", "service": "triage", "session_id": request.session_id}
