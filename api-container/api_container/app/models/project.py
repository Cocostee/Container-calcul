"""Model - Project (a saved loading project)."""
import uuid
from datetime import datetime
from typing import List

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api_container.config.database import Base


class Project(Base):
    """A loading project: a batch of packages and the containers to load.

    The container sizes and pallet formats live on ``ProjectContainer``, one
    row per container: a project is a shipment, not a single container.
    """

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

    # The packages to ship. They belong to the project, not to a container:
    # the computation is what spreads them across containers.
    packages: Mapped[List["PackageLine"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="PackageLine.label",
    )
    containers: Mapped[List["ProjectContainer"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectContainer.position",
    )
    results: Mapped[List["PlacementResult"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="PlacementResult.computed_at",
    )
