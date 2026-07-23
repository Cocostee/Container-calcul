"""Repository - reference data (container types, palette types)."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from api_container.app.models import ContainerType, PaletteType


class ReferenceRepository:
    """Read/seed access to the frozen reference tables."""

    def __init__(self, db: Session) -> None:
        """Store the session used for queries."""
        self._db = db

    def list_container_types(self) -> List[ContainerType]:
        """Return all container types ordered by length."""
        stmt = select(ContainerType).order_by(ContainerType.length_cm)
        return list(self._db.scalars(stmt))

    def list_palette_types(self) -> List[PaletteType]:
        """Return all palette types ordered by name."""
        stmt = select(PaletteType).order_by(PaletteType.name)
        return list(self._db.scalars(stmt))

    def get_container_type(self, type_id: str) -> Optional[ContainerType]:
        """Return a container type by id, or None."""
        return self._db.get(ContainerType, type_id)

    def get_palette_type(self, type_id: str) -> Optional[PaletteType]:
        """Return a palette type by id, or None."""
        return self._db.get(PaletteType, type_id)

    def add(self, entity: object) -> None:
        """Stage a new reference entity for insertion."""
        self._db.add(entity)
