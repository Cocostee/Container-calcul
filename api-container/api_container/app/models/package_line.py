"""Model - PackageLine (one package line of a project)."""
import uuid
from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api_container.config.database import Base


class PackageLine(Base):
    """One package line to ship: dimensions, weight and how many.

    ``palette_type_id`` stays available for lines that came from an import
    already palletised, where the source file named a pallet format.
    """

    __tablename__ = "project_packages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    palette_type_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("palette_types.id"), nullable=True
    )
    label: Mapped[str] = mapped_column(String, nullable=False)
    length_cm: Mapped[float] = mapped_column(Float, nullable=False)
    width_cm: Mapped[float] = mapped_column(Float, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    stackable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rotatable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    project: Mapped["Project"] = relationship(back_populates="packages")
