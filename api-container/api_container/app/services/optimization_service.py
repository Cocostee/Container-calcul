"""Service - spread the packages across the containers and persist the plan."""
import json
import uuid
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from api_container.app.exceptions import (
    EntityNotFoundError,
    ValidationDomainError,
)
from api_container.app.models import PlacementResult, Project, ProjectContainer
from api_container.app.packing import (
    Bin,
    ContainerSlot,
    Dimensions,
    Item,
    LoadedContainer,
    MultiLoadResult,
    Placement,
    load_containers,
)
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.schemas.placement_schema import (
    ContainerDimensions,
    ContainerLoadSchema,
    GeneratedPalletSchema,
    OptimizeContainerInput,
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
# Safety net for auto-extension: a package no container can take must not
# make the server add containers for ever.
_MAX_AUTO_CONTAINERS = 40


class OptimizationService:
    """Orchestrate: load the project, spread packages, persist, format."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._db = db
        self._projects = ProjectRepository(db)

    def optimize(
        self, project_id: uuid.UUID, request: OptimizeRequest
    ) -> OptimizeResponse:
        """Compute the loading plan for the given state and persist it."""
        project = self._projects.get(project_id)
        if project is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")
        if not request.containers:
            raise ValidationDomainError(
                "A loading plan needs at least one container."
            )

        packages = self._explode(request.packages)
        containers = list(request.containers)

        if request.auto_extend:
            # Clone the last container until nothing is left on the dock, and
            # remember the ones that had to be added.
            containers, result = self._extend_until_loaded(containers, packages)
            if len(containers) > len(request.containers):
                self._persist_added_containers(project, containers)
        else:
            result = load_containers(self._to_slots(containers), packages)

        response = self._build_response(containers, result, project)

        entity = PlacementResult(
            project_id=project.id,
            fill_rate_volume=response.fill_rate_volume,
            fill_rate_weight=response.fill_rate_weight,
            unplaced_package_count=response.unplaced_package_count,
            # .json() rather than .dict(): the plan holds UUIDs, which the
            # column's JSON serialiser cannot convert on its own.
            containers=[
                json.loads(loaded.json()) for loaded in response.containers
            ],
        )
        self._projects.add_result(entity)
        self._db.commit()

        return response

    def get_last_result(self, project_id: uuid.UUID) -> PlacementResultSchema:
        """Return the most recent persisted plan for a project."""
        if self._projects.get(project_id) is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")
        last = self._projects.get_last_result(project_id)
        if last is None:
            raise EntityNotFoundError(
                f"No plan computed yet for project '{project_id}'"
            )
        return PlacementResultSchema.from_orm(last)

    def _extend_until_loaded(
        self,
        containers: List[OptimizeContainerInput],
        packages: List[Item],
    ) -> Tuple[List[OptimizeContainerInput], MultiLoadResult]:
        """Add copies of the last container until every package is loaded.

        Stops as soon as an extra container takes nothing, which means the
        leftover packages are simply too large or too heavy for that format.
        """
        extended = list(containers)
        result = load_containers(self._to_slots(extended), packages)

        while result.unplaced_package_ids and len(extended) < _MAX_AUTO_CONTAINERS:
            template = extended[-1]
            extended.append(
                OptimizeContainerInput(
                    id=None,
                    container=template.container,
                    pallet=template.pallet,
                )
            )
            next_result = load_containers(self._to_slots(extended), packages)
            if len(next_result.unplaced_package_ids) >= len(
                result.unplaced_package_ids
            ):
                # The added container changed nothing: give it back and stop.
                extended.pop()
                break
            result = next_result

        return extended, result

    def _persist_added_containers(
        self, project: Project, containers: List[OptimizeContainerInput]
    ) -> None:
        """Save the containers the computation had to add to fit everything."""
        existing = len(project.containers)
        for position in range(existing + 1, len(containers) + 1):
            template = project.containers[-1] if project.containers else None
            project.containers.append(
                ProjectContainer(
                    position=position,
                    container_type_id=(
                        template.container_type_id if template else None
                    ),
                    container_custom_dims=(
                        template.container_custom_dims if template else None
                    ),
                    pallet_type_id=(template.pallet_type_id if template else None),
                )
            )
        self._db.flush()

    @staticmethod
    def _to_slots(containers: List[OptimizeContainerInput]) -> List[ContainerSlot]:
        """Map the request contract to the pure packing entities."""
        return [
            ContainerSlot(
                id=f"container-{position}",
                container=Bin(
                    dimensions=Dimensions(
                        length=entry.container.length_cm,
                        width=entry.container.width_cm,
                        height=entry.container.height_cm,
                    ),
                    max_weight=entry.container.max_weight_kg,
                ),
                pallet=(
                    Bin(
                        dimensions=Dimensions(
                            length=entry.pallet.length_cm,
                            width=entry.pallet.width_cm,
                            height=entry.pallet.max_load_height_cm,
                        ),
                        max_weight=entry.pallet.max_weight_kg,
                    )
                    if entry.pallet is not None
                    else None
                ),
                pallet_base_height=(
                    entry.pallet.base_height_cm if entry.pallet else 0.0
                ),
                pallet_label=(entry.pallet.label if entry.pallet else "Charge"),
            )
            for position, entry in enumerate(containers, start=1)
        ]

    def _build_response(
        self,
        containers: List[OptimizeContainerInput],
        result: MultiLoadResult,
        project: Project,
    ) -> OptimizeResponse:
        """Assemble the public plan, container by container."""
        loads: List[ContainerLoadSchema] = []
        saved = list(project.containers)

        for index, (entry, loaded) in enumerate(zip(containers, result.containers)):
            container_id = entry.id
            if container_id is None and index < len(saved):
                container_id = saved[index].id
            pallet_type_id = (
                saved[index].pallet_type_id if index < len(saved) else None
            )
            loads.append(
                ContainerLoadSchema(
                    container_id=container_id,
                    position=index + 1,
                    name=f"{entry.container.name or 'Conteneur'} {index + 1}",
                    container=entry.container,
                    pallet_type_id=pallet_type_id,
                    pallet_label=(
                        entry.pallet.label if entry.pallet else None
                    ),
                    pallets=self._build_generated_pallets(entry.pallet, loaded),
                    placements=self._to_container_placements(loaded.placements),
                    fill_rate_volume=round(
                        loaded.fill_rate_volume, _RATE_DECIMALS
                    ),
                    fill_rate_weight=round(
                        loaded.fill_rate_weight, _RATE_DECIMALS
                    ),
                    used_weight=round(loaded.used_weight, _RATE_DECIMALS),
                )
            )

        return OptimizeResponse(
            fill_rate_volume=self._weighted_rate(
                loads, lambda load: load.fill_rate_volume
            ),
            fill_rate_weight=self._weighted_rate(
                loads, lambda load: load.fill_rate_weight
            ),
            unplaced_package_count=len(result.unplaced_package_ids),
            containers=loads,
        )

    @staticmethod
    def _weighted_rate(loads: List[ContainerLoadSchema], read) -> float:
        """Average a per-container rate, weighted by container volume."""
        total_volume = sum(
            load.container.length_cm
            * load.container.width_cm
            * load.container.height_cm
            for load in loads
        )
        if total_volume == 0:
            return 0.0
        weighted = sum(
            read(load)
            * load.container.length_cm
            * load.container.width_cm
            * load.container.height_cm
            for load in loads
        )
        return round(weighted / total_volume, _RATE_DECIMALS)

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
        pallet: Optional[PalletDimensions], loaded: LoadedContainer
    ) -> List[GeneratedPalletSchema]:
        """Describe each loaded pallet and the packages it carries.

        Empty for a container of already-built loads: there is no pallet to
        describe, the placements are those of the loads themselves.
        """
        if pallet is None:
            return []
        generated: List[GeneratedPalletSchema] = []
        for packed in loaded.pallets:
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
                    fill_rate_volume=round(packed.fill_rate_volume, _RATE_DECIMALS),
                    fill_rate_weight=round(packed.fill_rate_weight, _RATE_DECIMALS),
                    packages=packages,
                )
            )
        return generated

    @staticmethod
    def _explode(packages: List[OptimizePaletteInput]) -> List[Item]:
        """Turn quantity-bearing lines into one item per physical package."""
        items: List[Item] = []
        for package in packages:
            for index in range(package.quantity):
                items.append(
                    Item(
                        id=f"{package.instance_id}-{index}",
                        dimensions=Dimensions(
                            length=package.length_cm,
                            width=package.width_cm,
                            height=package.height_cm,
                        ),
                        weight=package.weight_kg,
                        stackable=package.stackable,
                        rotatable=package.rotatable,
                    )
                )
        return items
