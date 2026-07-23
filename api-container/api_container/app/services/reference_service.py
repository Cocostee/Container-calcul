"""Service - read access to reference data for the controllers."""
from typing import List

from sqlalchemy.orm import Session

from api_container.app.models import ContainerType, PaletteType
from api_container.app.repositories.reference_repository import ReferenceRepository


class ReferenceService:
    """Expose reference listings; thin orchestration over the repository."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._repository = ReferenceRepository(db)

    def list_container_types(self) -> List[ContainerType]:
        """Return every predefined container type."""
        return self._repository.list_container_types()

    def list_palette_types(self) -> List[PaletteType]:
        """Return every predefined palette type."""
        return self._repository.list_palette_types()
