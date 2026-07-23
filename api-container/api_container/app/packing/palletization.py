"""Multi-pallet packing built on top of the Extreme Point packer.

The single-bin packer remains responsible for the actual 3D placement.  This
module repeatedly fills an identical pallet and carries its unplaced items to
the next pallet until every feasible package has been assigned.
"""
from dataclasses import dataclass, field
from typing import List

from api_container.app.packing.entities import Bin, Item, PackingResult, Placement
from api_container.app.packing.packer import pack


@dataclass
class PackedPallet:
    """One generated pallet and the 3D placement of its packages."""

    id: str
    placements: List[Placement] = field(default_factory=list)
    fill_rate_volume: float = 0.0
    fill_rate_weight: float = 0.0
    used_weight: float = 0.0


@dataclass
class PalletizationResult:
    """All generated pallets plus packages that cannot fit any pallet."""

    pallets: List[PackedPallet] = field(default_factory=list)
    unplaced_ids: List[str] = field(default_factory=list)


def pack_into_pallets(
    pallet: Bin, items: List[Item], prefix: str = "palette"
) -> PalletizationResult:
    """Fill as many pallets as needed using the best placement per pallet.

    The underlying deterministic heuristic orders packages by volume and uses
    extreme points.  After a pallet is filled, only the packages it could not
    take are sent to the next one.  The loop stops safely when none of the
    remaining packages can fit an empty pallet (oversized or overweight).
    """
    remaining = list(items)
    result = PalletizationResult()
    pallet_index = 1

    while remaining:
        packed: PackingResult = pack(pallet, remaining)
        if not packed.placements:
            result.unplaced_ids.extend(item.id for item in remaining)
            break

        placed_ids = {placement.item_id for placement in packed.placements}
        weights = {item.id: item.weight for item in remaining}
        result.pallets.append(
            PackedPallet(
                id=f"{prefix}-{pallet_index}",
                placements=packed.placements,
                fill_rate_volume=packed.fill_rate_volume,
                fill_rate_weight=packed.fill_rate_weight,
                used_weight=sum(weights[placement_id] for placement_id in placed_ids),
            )
        )
        remaining = [item for item in remaining if item.id not in placed_ids]
        pallet_index += 1

    return result
