"""Model - PlacementResult (output of an optimization run)."""
import uuid
from datetime import datetime
from typing import List

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api_container.config.database import Base


class PlacementResult(Base):
    """Persisted loading plan of a project, container by container."""

    __tablename__ = "placement_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Fill rates across the whole shipment, weighted by container volume.
    fill_rate_volume: Mapped[float] = mapped_column(Float, nullable=False)
    fill_rate_weight: Mapped[float] = mapped_column(Float, nullable=False)
    # Packages that no container could take.
    unplaced_package_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    # One entry per container: its envelope, its generated pallets and their
    # placements. Kept as JSON because it is read as a whole, never queried.
    containers: Mapped[List[dict]] = mapped_column(JSON, nullable=False, default=list)

    project: Mapped["Project"] = relationship(back_populates="results")
