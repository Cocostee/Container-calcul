"""Contract - project schemas."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from api_container.app.schemas.palette_schema import (
    PackageLineCreate,
    PackageLineSchema,
)
from api_container.app.schemas.placement_schema import PlacementResultSchema


class ProjectContainerBase(BaseModel):
    """One container of the project: its size and its pallet format."""

    container_type_id: Optional[str] = None
    container_custom_dims: Optional[dict] = None
    pallet_type_id: Optional[str] = None


class ProjectContainerCreate(ProjectContainerBase):
    """Payload to declare a container inside a project."""


class ProjectContainerSchema(ProjectContainerBase):
    """Persisted container of a project."""

    id: uuid.UUID
    position: int

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True


class ProjectBase(BaseModel):
    """Shared project fields."""

    name: str


class ProjectCreate(ProjectBase):
    """Payload to create a project with its packages and containers."""

    packages: List[PackageLineCreate] = Field(default_factory=list)
    containers: List[ProjectContainerCreate] = Field(default_factory=list)


class ProjectUpdate(ProjectBase):
    """Payload to fully replace a project's packages and containers."""

    packages: List[PackageLineCreate] = Field(default_factory=list)
    containers: List[ProjectContainerCreate] = Field(default_factory=list)


class ProjectSummarySchema(BaseModel):
    """Lightweight project entry for the project list."""

    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True


class ProjectSchema(ProjectBase):
    """Full project detail: packages, containers and last computed plan."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    packages: List[PackageLineSchema] = Field(default_factory=list)
    containers: List[ProjectContainerSchema] = Field(default_factory=list)
    last_result: Optional[PlacementResultSchema] = None
