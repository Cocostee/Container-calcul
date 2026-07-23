"""Contract - optimization request/response and persisted result schemas."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ContainerDimensions(BaseModel):
    """Container envelope used as input to the packing algorithm."""

    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    max_weight_kg: float = Field(..., gt=0)


class OptimizePaletteInput(BaseModel):
    """One package group to place (quantity is exploded server-side)."""

    instance_id: str
    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., ge=0)
    quantity: int = Field(1, ge=1)
    stackable: bool = True
    rotatable: bool = True


class PalletDimensions(BaseModel):
    """Selected pallet envelope used for the package-to-pallet stage."""

    id: str
    label: str
    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    base_height_cm: float = Field(..., ge=0)
    max_load_height_cm: float = Field(..., gt=0)
    max_weight_kg: float = Field(..., gt=0)


class OptimizeRequest(BaseModel):
    """Body of POST /projects/{id}/optimize (current, unsaved state).

    ``palettes`` stays available for previously saved projects.  New clients
    send package lines and the selected pallet dimensions to activate the
    two-stage optimization.
    """

    container: ContainerDimensions
    palettes: List[OptimizePaletteInput] = Field(default_factory=list)
    packages: List[OptimizePaletteInput] = Field(default_factory=list)
    pallet: Optional[PalletDimensions] = None


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


class PackagePlacementSchema(PlacementSchema):
    """Placement of a package within a generated pallet."""

    package_id: str


class GeneratedPalletSchema(BaseModel):
    """Generated pallet passed from stage 1 to the container stage."""

    id: str
    label: str
    length: float
    width: float
    height: float
    base_height: float
    weight_kg: float
    package_count: int
    fill_rate_volume: float
    fill_rate_weight: float
    packages: List[PackagePlacementSchema] = Field(default_factory=list)


class OptimizeResponse(BaseModel):
    """Two-stage optimization output."""

    fill_rate_volume: float
    fill_rate_weight: float
    unplaced_count: int
    placements: List[PlacementSchema]
    pallets: List[GeneratedPalletSchema] = Field(default_factory=list)
    unplaced_package_count: int = 0


class PlacementResultSchema(OptimizeResponse):
    """Persisted optimization result."""

    id: uuid.UUID
    project_id: uuid.UUID
    computed_at: datetime

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True
