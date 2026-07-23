"""Model - PaletteType (reference table of pallets)."""
from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from api_container.config.database import Base


class PaletteType(Base):
    """Predefined pallet type (Europe/EPAL, US, ...)."""

    __tablename__ = "palette_types"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    length_cm: Mapped[float] = mapped_column(Float, nullable=False)
    width_cm: Mapped[float] = mapped_column(Float, nullable=False)
    height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    default_load_height_cm: Mapped[float] = mapped_column(Float, nullable=False)
    max_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
