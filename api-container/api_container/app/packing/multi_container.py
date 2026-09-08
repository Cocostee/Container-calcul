"""Loading one batch of packages into several containers.

Each container carries its own size AND its own pallet format, so it
palletises the share of the batch it takes. Filling is sequential — container
1 serves itself first, then 2 takes what is left — which keeps the plan
reproducible and readable: adding a container at the end never reshuffles the
ones before it.

Pallets a container built but could not load are unmade: their packages go
back to the common batch, and the next container palletises them with its own
format. That is what allows mixing pallet formats inside one project.

This module stays pure domain: no FastAPI, no database.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

from api_container.app.packing.entities import Bin, Dimensions, Item, Placement
from api_container.app.packing.packer import pack
from api_container.app.packing.palletization import (
    PackedPallet,
    pack_into_pallets,
)


@dataclass(frozen=True)
class ContainerSlot:
    """One container of the project, with the pallet format it uses.

    ``pallet`` left at None means the container receives loads that are already
    built — the case of an imported plan, where the file describes assembled
    pallets: they are then loaded as they are, without being palletised.
    """

    id: str
    container: Bin
    pallet: Optional[Bin] = None
    """Height of the pallet deck, added to the load height."""
    pallet_base_height: float = 0.0
    pallet_label: str = "Palette"

    @property
    def load_ceiling(self) -> float:
        """Tallest load the hold allows, pallet deck deducted.

        This is the real limit: the reference format's load height is only a
        usual build height.
        """
        return max(0.0, self.container.dimensions.height - self.pallet_base_height)


@dataclass
class LoadedContainer:
    """What a container actually loaded."""

    slot_id: str
    pallets: List[PackedPallet] = field(default_factory=list)
    """Placement of each loaded pallet, identified by its id."""
    placements: List[Placement] = field(default_factory=list)
    fill_rate_volume: float = 0.0
    fill_rate_weight: float = 0.0
    used_weight: float = 0.0


@dataclass
class MultiLoadResult:
    """The complete loading plan, plus the packages left on the dock."""

    containers: List[LoadedContainer] = field(default_factory=list)
    unplaced_package_ids: List[str] = field(default_factory=list)


def _pallet_as_item(
    packed: PackedPallet, slot: ContainerSlot, stackable: bool
) -> Item:  # noqa: D401
    """Turn a filled pallet into a single item to load.

    Its height is the deck plus the load actually stacked, not the maximum
    allowed: a half-filled pallet must not take the room of a full one.

    ``stackable`` comes from the load: a pallet is only stackable if everything
    it carries accepts something on top.
    """
    load_height = max(
        (placement.z + placement.height for placement in packed.placements),
        default=0.0,
    )
    assert slot.pallet is not None
    return Item(
        id=packed.id,
        dimensions=Dimensions(
            length=slot.pallet.dimensions.length,
            width=slot.pallet.dimensions.width,
            height=slot.pallet_base_height + load_height,
        ),
        weight=packed.used_weight,
        stackable=stackable,
        rotatable=True,
    )


def load_containers(
    slots: Sequence[ContainerSlot], packages: List[Item]
) -> MultiLoadResult:
    """Spread ``packages`` across ``slots``, in the given order.

    A container palletises the remainder with its own format, loads what it
    can, and gives back to the batch the packages of the pallets left out.
    """
    remaining = list(packages)
    result = MultiLoadResult()

    for slot in slots:
        loaded = LoadedContainer(slot_id=slot.id)

        if remaining and slot.pallet is None:
            # Loads already built: they go straight into the hold.
            packed_container = pack(slot.container, remaining)
            loaded.placements = packed_container.placements
            loaded.fill_rate_volume = packed_container.fill_rate_volume
            loaded.fill_rate_weight = packed_container.fill_rate_weight
            shipped = {
                placement.item_id for placement in packed_container.placements
            }
            loaded.used_weight = sum(
                item.weight for item in remaining if item.id in shipped
            )
            remaining = [item for item in remaining if item.id not in shipped]
        elif remaining:
            palletization = pack_into_pallets(
                slot.pallet,
                remaining,
                prefix=f"{slot.id}-pallet",
                ceiling_height=slot.load_ceiling,
            )
            by_id = {item.id: item for item in remaining}
            pallet_items = [
                _pallet_as_item(
                    packed,
                    slot,
                    all(
                        by_id[placement.item_id].stackable
                        for placement in packed.placements
                    ),
                )
                for packed in palletization.pallets
            ]

            packed_container = pack(slot.container, pallet_items)
            loaded_ids = {
                placement.item_id for placement in packed_container.placements
            }

            loaded.pallets = [
                packed
                for packed in palletization.pallets
                if packed.id in loaded_ids
            ]
            loaded.placements = packed_container.placements
            loaded.fill_rate_volume = packed_container.fill_rate_volume
            loaded.fill_rate_weight = packed_container.fill_rate_weight
            loaded.used_weight = sum(
                packed.used_weight for packed in loaded.pallets
            )

            # Only the packages actually shipped leave the batch: those of
            # the pallets left out move on to the next container.
            shipped = {
                placement.item_id
                for packed in loaded.pallets
                for placement in packed.placements
            }
            remaining = [item for item in remaining if item.id not in shipped]

        result.containers.append(loaded)

    result.unplaced_package_ids = [item.id for item in remaining]
    return result


def simulate_containers(
    slot_template: ContainerSlot, packages: List[Item], limit: int = 40
) -> Tuple[int, List[str]]:
    """Simulate the batch in identical containers, until it runs out.

    Returns how many containers were used and which packages stayed on the
    dock. That remainder is not always empty: a package no container of this
    format can take — too large, too heavy, or impossible to palletise — will
    never ship, and saying so beats adding containers for ever. ``limit``
    bounds the search.
    """
    remaining = list(packages)
    used = 0

    while remaining and used < limit:
        slot = ContainerSlot(
            id=f"{slot_template.id}-{used + 1}",
            container=slot_template.container,
            pallet=slot_template.pallet,
            pallet_base_height=slot_template.pallet_base_height,
            pallet_label=slot_template.pallet_label,
        )
        step = load_containers([slot], remaining)
        shipped = len(remaining) - len(step.unplaced_package_ids)
        if shipped == 0:
            # This format will never take the remainder: adding is futile.
            break
        used += 1
        left = set(step.unplaced_package_ids)
        remaining = [item for item in remaining if item.id in left]

    return used, [item.id for item in remaining]


def containers_needed(
    slot_template: ContainerSlot, packages: List[Item], limit: int = 40
) -> int:
    """Count the identical containers needed to ship everything.

    Used to recommend a format: the best one needs the fewest. Returns **0**
    when the format can ship nothing at all — load too large or too heavy —
    which is distinct from "one is enough".
    """
    used, _ = simulate_containers(slot_template, packages, limit)
    return used
