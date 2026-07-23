"""Model - Project (a saved loading project)."""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api_container.config.database import Base


class Project(Base):
    """A container loading project: one container + its pallets."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    container_type_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("container_types.id"), nullable=True
    )
    # Populated only when the container is "custom" (free dimensions).
    container_custom_dims: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    palettes: Mapped[List["PaletteInstance"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="PaletteInstance.label",
    )
    results: Mapped[List["PlacementResult"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="PlacementResult.computed_at",
    )
