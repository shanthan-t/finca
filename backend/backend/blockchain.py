from typing import Any, Dict, List, Optional, Tuple

try:
    from .utils import calculate_hash, utc_timestamp
except ImportError:  # pragma: no cover
    from backend.utils import calculate_hash, utc_timestamp


def create_genesis_block(batch) -> Dict[str, Any]:
    timestamp = utc_timestamp()
    index = 0
    previous_hash = "0"

    data = {
        "batch_id": batch.batch_id,
        "crop_name": batch.crop_name,
        "farmer_name": batch.farmer_name,
        "farm_location": batch.farm_location,
    }

    hash_value = calculate_hash(index, timestamp, "batch_created", data, previous_hash)

    return {
        "index": index,
        "timestamp": timestamp,
        "event_type": "batch_created",
        "data": data,
        "previous_hash": previous_hash,
        "hash": hash_value,
    }


def create_block(block_input) -> Dict[str, Any]:
    timestamp = utc_timestamp()

    hash_value = calculate_hash(
        block_input.index,
        timestamp,
        block_input.event_type,
        block_input.data,
        block_input.previous_hash,
    )

    return {
        "index": block_input.index,
        "timestamp": timestamp,
        "event_type": block_input.event_type,
        "data": block_input.data,
        "previous_hash": block_input.previous_hash,
        "hash": hash_value,
    }


def validate_chain(blocks: List[Dict[str, Any]]) -> Tuple[bool, Optional[int]]:
    if not blocks:
        return True, None

    first = blocks[0]
    first_hash = calculate_hash(
        first["index"],
        first["timestamp"],
        first["event_type"],
        first["data"],
        first["previous_hash"],
    )
    if first["hash"] != first_hash:
        return False, 0

    for i in range(1, len(blocks)):
        prev = blocks[i - 1]
        curr = blocks[i]

        recalculated_hash = calculate_hash(
            curr["index"],
            curr["timestamp"],
            curr["event_type"],
            curr["data"],
            curr["previous_hash"],
        )

        if curr["hash"] != recalculated_hash:
            return False, i

        if curr["previous_hash"] != prev["hash"]:
            return False, i

    return True, None
