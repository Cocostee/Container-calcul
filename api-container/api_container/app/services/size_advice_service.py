"""Service - which container and pallet sizes ship a batch the cheapest.

For each reference size, the batch is simulated end to end and the result is
reported as a plain count: how many containers a size would require, how many
pallets a format would build. The recommended size is the one that needs the
fewest containers, because that is what drives the freight bill; a tie is
settled by the better fill rate.
"""
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from api_container.app.exceptions import EntityNotFoundError
from api_container.app.models import ContainerType, PaletteType
from api_container.app.packing import (
    Bin,
    ContainerSlot,
    Dimensions,
    Item,
    load_containers,
    pack_into_pallets,
    simulate_containers,
)
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.repositories.reference_repository import ReferenceRepository
from api_container.app.schemas.placement_schema import (
    ContainerSizeAdviceSchema,
    PalletSizeAdviceSchema,
    SizeAdviceResponse,
)

_RATE_DECIMALS = 4


class SizeAdviceService:
    """Simulate every reference size over a project's packages."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._db = db
        self._projects = ProjectRepository(db)
        self._reference = ReferenceRepository(db)

    def advise(
        self,
        project_id: uuid.UUID,
        pallet_type_id: Optional[str] = None,
        palletize: bool = True,
    ) -> SizeAdviceResponse:
        """Rate every size for a saved project's packages."""
        project = self._projects.get(project_id)
        if project is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")
        return self.advise_for(
            self.explode_lines(project.packages), pallet_type_id, palletize
        )

    def advise_for(
        self,
        packages: List[Item],
        pallet_type_id: Optional[str] = None,
        palletize: bool = True,
    ) -> SizeAdviceResponse:
        """Rate every container size and every pallet format for a batch.

        Container sizes are compared on the same basis as the real
        computation, so the figures never promise what the plan will not
        deliver: ``palletize=False`` means the caller has explicitly chosen
        "no pallet — loads go in as they are", and the containers are then
        rated without palletisation. Otherwise ``pallet_type_id`` is used when
        given, and the format needing the fewest pallets when it is not.
        """
        pallet_types = self._reference.list_palette_types()
        container_types = self._reference.list_container_types()

        pallet_advice = self._rate_pallets(
            pallet_types, container_types, packages
        )
        reference_pallet = (
            self._pick_pallet(pallet_types, pallet_advice, pallet_type_id)
            if palletize
            else None
        )
        container_advice = self._rate_containers(
            container_types, reference_pallet, packages
        )

        return SizeAdviceResponse(
            containers=container_advice, pallets=pallet_advice
        )

    def _rate_pallets(
        self,
        pallet_types: List[PaletteType],
        container_types: List[ContainerType],
        packages: List[Item],
    ) -> List[PalletSizeAdviceSchema]:
        """Count the pallets each format would build for the whole batch.

        Rated against the tallest hold available, so a package taller than a
        format's reference load height is not counted as impossible: the
        figures must match what the plan will do.
        """
        tallest = max(
            (container.height_cm for container in container_types), default=0.0
        )
        advice: List[PalletSizeAdviceSchema] = []
        for pallet in pallet_types:
            result = pack_into_pallets(
                self._pallet_bin(pallet),
                packages,
                ceiling_height=max(0.0, tallest - pallet.height_cm),
            )
            advice.append(
                PalletSizeAdviceSchema(
                    pallet_type_id=pallet.id,
                    name=pallet.name,
                    pallets_needed=len(result.pallets),
                    unplaced_package_count=len(result.unplaced_ids),
                )
            )

        # Everything travels on pallets, so there is always a format to
        # recommend, even when none ships the whole batch. The best one leaves
        # the fewest packages on the dock; a tie goes to the one building the
        # fewest pallets.
        usable = [entry for entry in advice if entry.pallets_needed > 0]
        candidates = usable or advice
        if candidates:
            best = min(
                candidates,
                key=lambda entry: (
                    entry.unplaced_package_count,
                    entry.pallets_needed,
                ),
            )
            for entry in advice:
                entry.recommended = entry is best
        return advice

    def _rate_containers(
        self,
        container_types: List[ContainerType],
        pallet: Optional[PaletteType],
        packages: List[Item],
    ) -> List[ContainerSizeAdviceSchema]:
        """Count the containers each size would require for the batch.

        Without a pallet format, the loads are counted as they are — the
        question an imported plan asks, where the pallets already exist.
        """
        if not packages:
            return [
                ContainerSizeAdviceSchema(
                    container_type_id=container.id,
                    name=container.name,
                    containers_needed=0,
                    fill_rate_volume=0.0,
                )
                for container in container_types
            ]

        advice: List[ContainerSizeAdviceSchema] = []
        for container in container_types:
            template = ContainerSlot(
                id=container.id,
                container=self._container_bin(container),
                pallet=self._pallet_bin(pallet) if pallet else None,
                pallet_base_height=pallet.height_cm if pallet else 0.0,
                pallet_label=pallet.name if pallet else "Charge",
            )
            needed, left_on_dock = simulate_containers(template, packages)
            # Fill rate of the very first container, as a tie-breaker.
            first = load_containers([template], packages)
            advice.append(
                ContainerSizeAdviceSchema(
                    container_type_id=container.id,
                    name=container.name,
                    containers_needed=needed,
                    unplaced_package_count=len(left_on_dock),
                    fill_rate_volume=round(
                        first.containers[0].fill_rate_volume, _RATE_DECIMALS
                    ),
                )
            )

        # A format that can ship nothing (0) is no candidate, and a size that
        # leaves packages on the dock is only recommended when no other ships
        # them all: the suggestion must never lead to an incomplete plan.
        usable = [entry for entry in advice if entry.containers_needed > 0]
        complete = [
            entry for entry in usable if entry.unplaced_package_count == 0
        ]
        candidates = complete or usable
        if candidates:
            best = min(
                candidates,
                key=lambda entry: (
                    entry.containers_needed,
                    -entry.fill_rate_volume,
                ),
            )
            for entry in advice:
                entry.recommended = entry is best
        return advice

    @staticmethod
    def _pick_pallet(
        pallet_types: List[PaletteType],
        advice: List[PalletSizeAdviceSchema],
        requested_id: Optional[str],
    ) -> Optional[PaletteType]:
        """Choose the pallet the container comparison is run with.

        Never returns nothing when a format exists: comparing containers on
        loose loads would advise a shipment that cannot be handled.
        """
        by_id = {pallet.id: pallet for pallet in pallet_types}
        if requested_id and requested_id in by_id:
            return by_id[requested_id]
        recommended = next(
            (entry for entry in advice if entry.recommended), None
        )
        if recommended is not None and recommended.pallet_type_id in by_id:
            return by_id[recommended.pallet_type_id]
        return pallet_types[0] if pallet_types else None

    @staticmethod
    def _container_bin(container: ContainerType) -> Bin:
        return Bin(
            dimensions=Dimensions(
                length=container.length_cm,
                width=container.width_cm,
                height=container.height_cm,
            ),
            max_weight=container.max_weight_kg,
        )

    @staticmethod
    def _pallet_bin(pallet: PaletteType) -> Bin:
        return Bin(
            dimensions=Dimensions(
                length=pallet.length_cm,
                width=pallet.width_cm,
                height=pallet.default_load_height_cm,
            ),
            max_weight=pallet.max_weight_kg,
        )

    @staticmethod
    def explode_lines(lines) -> List[Item]:
        """One item per physical package, from any package-bearing lines."""
        items: List[Item] = []
        for position, line in enumerate(lines):
            # A persisted line carries an ``id``, a request line an
            # ``instance_id``; failing both, its position names it.
            base = (
                getattr(line, 'id', None)
                or getattr(line, 'instance_id', None)
                or f'line-{position}'
            )
            for index in range(line.quantity):
                items.append(
                    Item(
                        id=f"{base}-{index}",
                        dimensions=Dimensions(
                            length=line.length_cm,
                            width=line.width_cm,
                            height=line.height_cm,
                        ),
                        weight=line.weight_kg,
                        stackable=line.stackable,
                        rotatable=line.rotatable,
                    )
                )
        return items
