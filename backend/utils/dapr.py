import json
import logging
import socket
import urllib.request

logger = logging.getLogger("dapr")


def dapr_available() -> bool:
    """Quick 0.5s socket check — avoids 60s Dapr health-check timeout."""
    try:
        with socket.create_connection(("127.0.0.1", 3500), timeout=0.5):
            return True
    except OSError:
        return False


def publish_event(pubsub_name: str, topic_name: str, payload: dict) -> None:
    """Fire-and-forget Dapr publish — non-fatal if Dapr is unavailable."""
    if not dapr_available():
        logger.debug("Dapr not available — skipping event publish")
        return
    try:
        from dapr.clients import DaprClient
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=pubsub_name,
                topic_name=topic_name,
                data=json.dumps(payload),
                data_content_type="application/json",
            )
        logger.info("Published event topic=%r", topic_name)
    except Exception as exc:
        logger.warning("Failed to publish event (non-fatal): %s", exc)


def record_direct(endpoint_url: str, payload: dict, label: str = "event") -> None:
    """Directly POST to progress service when Dapr is unavailable."""
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            endpoint_url, data=data,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
        logger.info("Recorded %s via direct HTTP", label)
    except Exception as exc:
        logger.warning("Direct %s record failed (non-fatal): %s", label, exc)
