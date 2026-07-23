"""Contract - container schemas."""
from pydantic import BaseModel


class ContainerTypeSchema(BaseModel):
    """Reference container type returned by GET /container-types."""

    id: str
    name: str
    length_cm: float
    width_cm: float
    height_cm: float
    max_weight_kg: float

    class Config:
        """Enable population from SQLAlchemy model instances."""

        orm_mode = True
