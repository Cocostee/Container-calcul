"""Contract - palette type and package line schemas."""
import uuid
from typing import Optional

from pydantic import BaseModel, Field


class PaletteTypeSchema(BaseModel):
    """Reference palette type returned by GET /palette-types."""

    id: str
    name: str
    length_cm: float
    width_cm: float
    height_cm: float
    default_load_height_cm: float
    max_weight_kg: float

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True


class PackageLineBase(BaseModel):
    """Shared fields of a package line inside a project."""

    palette_type_id: Optional[str] = None
    label: str
    length_cm: float = Field(..., gt=0)
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., ge=0)
    quantity: int = Field(1, ge=1)
    stackable: bool = True
    rotatable: bool = True


class PackageLineCreate(PackageLineBase):
    """Payload to create/replace a package line."""


class PackageLineSchema(PackageLineBase):
    """Persisted package line returned to the client."""

    id: uuid.UUID

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True
