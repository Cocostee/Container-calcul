"""Model - ContainerType (frozen reference table)."""
from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from api_container.config.database import Base


class ContainerType(Base):
    """Predefined container type (20ft, 40ft, ...)."""

    __tablename__ = "container_types"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    length_cm: Mapped[float] = mapped_column(Float, nullable=False)
    width_cm: Mapped[float] = mapped_column(Float, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    max_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
