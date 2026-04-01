from typing import Any, Dict, List

from pydantic import BaseModel


class BatchCreate(BaseModel):
    batch_id: str
    crop_name: str
    farmer_name: str
    farm_location: str


class BlockCreate(BaseModel):
    batch_id: str
    event_type: str
    data: Dict[str, Any]
    previous_hash: str
    index: int


class ValidateRequest(BaseModel):
    blocks: List[Dict[str, Any]]
