"""Service - run the packer and persist the placement result."""
import uuid
from typing import List

from sqlalchemy.orm import Session

from api_container.app.exceptions import EntityNotFoundError
from api_container.app.models import PlacementResult
from api_container.app.packing import Bin, Dimensions, Item, pack
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.schemas.placement_schema import (
    ContainerDimensions,
    OptimizePaletteInput,
    OptimizeRequest,
    OptimizeResponse,
    PlacementResultSchema,
    PlacementSchema,
)

# Fill rates are stored/returned rounded to this many decimals.
_RATE_DECIMALS = 4


class OptimizationService:
    """Orchestrate: load project, build entities, pack, persist, format."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._db = db
        self._projects = ProjectRepository(db)

    def optimize(
        self, project_id: uuid.UUID, request: OptimizeRequest
    ) -> OptimizeResponse:
        """Compute a placement for the given state and persist it."""
        project = self._projects.get(project_id)
        if project is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")

        container = self._build_bin(request.container)
        items = self._explode(request.palettes)
        result = pack(container, items)

        placements = [
            PlacementSchema(
                palette_instance_id=placement.item_id,
                x=placement.x,
                y=placement.y,
                z=placement.z,
                length=placement.length,
                width=placement.width,
                height=placement.height,
                rotation=placement.rotation,
            )
            for placement in result.placements
        ]
        response = OptimizeResponse(
            fill_rate_volume=round(result.fill_rate_volume, _RATE_DECIMALS),
            fill_rate_weight=round(result.fill_rate_weight, _RATE_DECIMALS),
            unplaced_count=len(result.unplaced_ids),
            placements=placements,
        )

        entity = PlacementResult(
            project_id=project.id,
            fill_rate_volume=response.fill_rate_volume,
            fill_rate_weight=response.fill_rate_weight,
            unplaced_count=response.unplaced_count,
            placements=[placement.dict() for placement in placements],
        )
        self._projects.add_result(entity)
        self._db.commit()

        return response

    def get_last_result(self, project_id: uuid.UUID) -> PlacementResultSchema:
        """Return the most recent persisted result for a project."""
        if self._projects.get(project_id) is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")
        last = self._projects.get_last_result(project_id)
        if last is None:
            raise EntityNotFoundError(
                f"No result computed yet for project '{project_id}'"
            )
        return PlacementResultSchema.from_orm(last)

    @staticmethod
    def _build_bin(container: ContainerDimensions) -> Bin:
        return Bin(
            dimensions=Dimensions(
                length=container.length_cm,
                width=container.width_cm,
                height=container.height_cm,
            ),
            max_weight=container.max_weight_kg,
        )

    @staticmethod
    def _explode(palettes: List[OptimizePaletteInput]) -> List[Item]:
        items: List[Item] = []
        for palette in palettes:
            for index in range(palette.quantity):
                items.append(
                    Item(
                        id=f"{palette.instance_id}-{index}",
                        dimensions=Dimensions(
                            length=palette.length_cm,
                            width=palette.width_cm,
                            height=palette.height_cm,
                        ),
                        weight=palette.weight_kg,
                        stackable=palette.stackable,
                        rotatable=palette.rotatable,
                    )
                )
        return items
