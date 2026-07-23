"""Contract - project schemas."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from api_container.app.schemas.palette_schema import (
    PaletteInstanceCreate,
    PaletteInstanceSchema,
)
from api_container.app.schemas.placement_schema import PlacementResultSchema


class ProjectBase(BaseModel):
    """Shared project configuration fields."""

    name: str
    container_type_id: Optional[str] = None
    container_custom_dims: Optional[dict] = None


class ProjectCreate(ProjectBase):
    """Payload to create a project."""

    palettes: List[PaletteInstanceCreate] = Field(default_factory=list)


class ProjectUpdate(ProjectBase):
    """Payload to fully update a project's config and pallets."""

    palettes: List[PaletteInstanceCreate] = Field(default_factory=list)


class ProjectSummarySchema(BaseModel):
    """Lightweight project entry for the sidebar list."""

    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True


class ProjectSchema(ProjectBase):
    """Full project detail: config + pallets + last computed result."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    palettes: List[PaletteInstanceSchema] = Field(default_factory=list)
    last_result: Optional[PlacementResultSchema] = None
