"""Contract - optimization request/response and persisted result schemas."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ContainerDimensions(BaseModel):
    """Container envelope used as input to the packing algorithm."""

    # Purely for display: the algorithm only reads the dimensions.
    name: Optional[str] = None
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


class OptimizeContainerInput(BaseModel):
    """One container to load, with the pallet format it uses.

    ``pallet`` left out means the container receives loads that are already
    built — an imported plan, where the file describes assembled pallets. They
    are then loaded as they are, without being palletised again.
    """

    # Absent for a container the client is adding but has not saved yet.
    id: Optional[uuid.UUID] = None
    container: ContainerDimensions
    pallet: Optional[PalletDimensions] = None


class OptimizeRequest(BaseModel):
    """Body of POST /projects/{id}/optimize (current, unsaved state).

    The packages belong to the project; the containers say where they may go.
    When ``auto_extend`` is set and packages are left over, the server adds
    containers cloned from the last one until everything is loaded, and saves
    them on the project.
    """

    packages: List[OptimizePaletteInput] = Field(default_factory=list)
    containers: List[OptimizeContainerInput] = Field(default_factory=list)
    auto_extend: bool = False


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


class ContainerLoadSchema(BaseModel):
    """What one container of the project ended up carrying."""

    container_id: Optional[uuid.UUID] = None
    position: int
    name: str
    container: ContainerDimensions
    pallet_type_id: Optional[str] = None
    pallet_label: Optional[str] = None
    pallets: List[GeneratedPalletSchema] = Field(default_factory=list)
    placements: List[PlacementSchema] = Field(default_factory=list)
    fill_rate_volume: float = 0.0
    fill_rate_weight: float = 0.0
    used_weight: float = 0.0


class OptimizeResponse(BaseModel):
    """Loading plan across every container of the project."""

    # Weighted across containers, so the figure describes the whole shipment.
    fill_rate_volume: float
    fill_rate_weight: float
    unplaced_package_count: int = 0
    containers: List[ContainerLoadSchema] = Field(default_factory=list)


class PlacementResultSchema(OptimizeResponse):
    """Persisted loading plan."""

    id: uuid.UUID
    project_id: uuid.UUID
    computed_at: datetime

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True


class ContainerSizeAdviceSchema(BaseModel):
    """How a container size would fare for the whole batch of packages."""

    container_type_id: str
    name: str
    containers_needed: int
    fill_rate_volume: float
    # Packages no container of this size would take: a size that leaves
    # anything on the dock is never recommended while another ships it all.
    unplaced_package_count: int = 0
    recommended: bool = False


class PalletSizeAdviceSchema(BaseModel):
    """How a pallet format would fare for the whole batch of packages."""

    pallet_type_id: str
    name: str
    pallets_needed: int
    unplaced_package_count: int
    recommended: bool = False


class SizeAdviceRequest(BaseModel):
    """Advice request for a batch that is not a project yet.

    Serves the import wizard: a size must be advised before the project even
    exists.
    """

    packages: List[OptimizePaletteInput] = Field(default_factory=list)
    # Compare containers with this pallet format, so the figures answer
    # "with the pallet I picked, which container?".
    pallet_type_id: Optional[str] = None
    # ``False`` says explicitly "no pallet": the loads go into the hold as
    # they are. Without this flag, a missing ``pallet_type_id`` would mean
    # "pick for me", and the announced container count would not match the
    # computation actually run.
    palletize: bool = True


class SizeAdviceResponse(BaseModel):
    """Sizes that ship the batch with the fewest containers."""

    containers: List[ContainerSizeAdviceSchema] = Field(default_factory=list)
    pallets: List[PalletSizeAdviceSchema] = Field(default_factory=list)
