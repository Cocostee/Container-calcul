"""Contract - optimization request/response and persisted result schemas."""
import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ContainerDimensions(BaseModel):
    """Container envelope used as input to the packing algorithm."""

    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    max_weight_kg: float = Field(..., gt=0)


class OptimizePaletteInput(BaseModel):
    """One pallet group to place (quantity is exploded server-side)."""

    instance_id: str
    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., ge=0)
    quantity: int = Field(1, ge=1)
    stackable: bool = True
    rotatable: bool = True


class OptimizeRequest(BaseModel):
    """Body of POST /projects/{id}/optimize (current, unsaved state)."""

    container: ContainerDimensions
    palettes: List[OptimizePaletteInput]


class PlacementSchema(BaseModel):
    """Placement of a single exploded pallet item in the container."""

    palette_instance_id: str
    x: float
    y: float
    z: float
    length: float
    width: float
    height: float
    rotation: int


class OptimizeResponse(BaseModel):
    """Optimization output (matches spec section 5.2)."""

    fill_rate_volume: float
    fill_rate_weight: float
    unplaced_count: int
    placements: List[PlacementSchema]


class PlacementResultSchema(OptimizeResponse):
    """Persisted optimization result."""

    id: uuid.UUID
    project_id: uuid.UUID
    computed_at: datetime

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True
