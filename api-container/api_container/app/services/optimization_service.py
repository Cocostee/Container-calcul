"""Service - run the packer and persist the placement result."""
import uuid
from typing import List

from sqlalchemy.orm import Session

from api_container.app.exceptions import EntityNotFoundError
from api_container.app.models import PlacementResult
from api_container.app.packing import (
    Bin,
    Dimensions,
    Item,
    PackedPallet,
    Placement,
    pack,
    pack_into_pallets,
)
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.schemas.placement_schema import (
    ContainerDimensions,
    GeneratedPalletSchema,
    OptimizePaletteInput,
    OptimizeRequest,
    OptimizeResponse,
    PackagePlacementSchema,
    PalletDimensions,
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

        if request.pallet is not None:
            response = self._optimize_packages(
                request.container, request.pallet, request.packages
            )
        else:
            response = self._optimize_legacy(request.container, request.palettes)

        entity = PlacementResult(
            project_id=project.id,
            fill_rate_volume=response.fill_rate_volume,
            fill_rate_weight=response.fill_rate_weight,
            unplaced_count=response.unplaced_count,
            placements=[placement.dict() for placement in response.placements],
            pallets=[pallet.dict() for pallet in response.pallets],
            unplaced_package_count=response.unplaced_package_count,
        )
        self._projects.add_result(entity)
        self._db.commit()

        return response

    @classmethod
    def _optimize_packages(
        cls,
        container_dimensions: ContainerDimensions,
        pallet: PalletDimensions,
        packages: List[OptimizePaletteInput],
    ) -> OptimizeResponse:
        """Stage 1: pack packages into pallets; stage 2: pack pallets inside."""
        package_items = cls._explode(packages)
        pallet_bin = Bin(
            dimensions=Dimensions(
                length=pallet.length_cm,
                width=pallet.width_cm,
                height=pallet.max_load_height_cm,
            ),
            max_weight=pallet.max_weight_kg,
        )
        palletization = pack_into_pallets(pallet_bin, package_items)
        generated_pallets = cls._build_generated_pallets(
            pallet, palletization.pallets
        )
        container_items = [
            Item(
                id=generated.id,
                dimensions=Dimensions(
                    generated.length,
                    generated.width,
                    generated.height,
                ),
                weight=generated.weight_kg,
                stackable=True,
                rotatable=True,
            )
            for generated in generated_pallets
        ]
        container_result = pack(cls._build_bin(container_dimensions), container_items)
        return OptimizeResponse(
            fill_rate_volume=round(
                container_result.fill_rate_volume, _RATE_DECIMALS
            ),
            fill_rate_weight=round(
                container_result.fill_rate_weight, _RATE_DECIMALS
            ),
            unplaced_count=len(container_result.unplaced_ids),
            placements=cls._to_container_placements(container_result.placements),
            pallets=generated_pallets,
            unplaced_package_count=len(palletization.unplaced_ids),
        )

    @classmethod
    def _optimize_legacy(
        cls,
        container_dimensions: ContainerDimensions,
        palettes: List[OptimizePaletteInput],
    ) -> OptimizeResponse:
        """Keep saved projects from before package palletization functional."""
        result = pack(cls._build_bin(container_dimensions), cls._explode(palettes))
        return OptimizeResponse(
            fill_rate_volume=round(result.fill_rate_volume, _RATE_DECIMALS),
            fill_rate_weight=round(result.fill_rate_weight, _RATE_DECIMALS),
            unplaced_count=len(result.unplaced_ids),
            placements=cls._to_container_placements(result.placements),
        )

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
    def _to_container_placements(
        placements: List[Placement],
    ) -> List[PlacementSchema]:
        """Map pure packing placements to the public container contract."""
        return [
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
            for placement in placements
        ]

    @staticmethod
    def _build_generated_pallets(
        pallet: PalletDimensions, packed_pallets: List[PackedPallet]
    ) -> List[GeneratedPalletSchema]:
        """Build stage-one results with the package layout needed by the 3D view."""
        generated: List[GeneratedPalletSchema] = []
        for packed in packed_pallets:
            load_height = max(
                (placement.z + placement.height for placement in packed.placements),
                default=0.0,
            )
            packages = [
                PackagePlacementSchema(
                    package_id=placement.item_id,
                    palette_instance_id=packed.id,
                    x=placement.x,
                    y=placement.y,
                    z=placement.z,
                    length=placement.length,
                    width=placement.width,
                    height=placement.height,
                    rotation=placement.rotation,
                )
                for placement in packed.placements
            ]
            generated.append(
                GeneratedPalletSchema(
                    id=packed.id,
                    label=f"{pallet.label} {len(generated) + 1}",
                    length=pallet.length_cm,
                    width=pallet.width_cm,
                    height=pallet.base_height_cm + load_height,
                    base_height=pallet.base_height_cm,
                    weight_kg=round(packed.used_weight, _RATE_DECIMALS),
                    package_count=len(packages),
                    fill_rate_volume=round(
                        packed.fill_rate_volume, _RATE_DECIMALS
                    ),
                    fill_rate_weight=round(
                        packed.fill_rate_weight, _RATE_DECIMALS
                    ),
                    packages=packages,
                )
            )
        return generated

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
