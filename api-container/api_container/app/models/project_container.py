"""Model - ProjectContainer (one container inside a loading project)."""
import uuid
from typing import Optional

from sqlalchemy import JSON, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api_container.config.database import Base


class ProjectContainer(Base):
    """A container to load, with the pallet format it is loaded with.

    A project holds several of these: an order that does not fit in one
    container is a single project with several containers, not several
    projects. Each one carries its own container size *and* its own pallet
    format, so formats can be mixed within the same shipment.
    """

    __tablename__ = "project_containers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    # Loading order: container 1 is served first, then 2 takes what is left.
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    container_type_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("container_types.id"), nullable=True
    )
    # Populated only when the container size is "custom" (free dimensions).
    container_custom_dims: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    pallet_type_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("palette_types.id"), nullable=True
    )

    project: Mapped["Project"] = relationship(back_populates="containers")
