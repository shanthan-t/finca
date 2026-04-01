import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict


def utc_timestamp() -> str:
    """Return a UTC ISO 8601 timestamp with a Z suffix."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def calculate_hash(
    index: int,
    timestamp: str,
    event_type: str,
    data: Dict[str, Any],
    previous_hash: str,
) -> str:
    block_string = (
        f"{index}{timestamp}{event_type}{json.dumps(data, sort_keys=True)}{previous_hash}"
    )
    return hashlib.sha256(block_string.encode()).hexdigest()
