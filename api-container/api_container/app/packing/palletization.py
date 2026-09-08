"""Multi-pallet packing built on top of the Extreme Point packer.

The single-bin packer remains responsible for the actual 3D placement.  This
module repeatedly fills an identical pallet and carries its unplaced items to
the next pallet until every feasible package has been assigned.
"""
from dataclasses import dataclass, field
from typing import List

from typing import Optional, Tuple

from api_container.app.packing.entities import (
    Bin,
    Dimensions,
    Item,
    PackingResult,
    Placement,
)
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


def _fill(
    pallet: Bin,
    remaining: List[Item],
    prefix: str,
    first_index: int,
    result: PalletizationResult,
) -> Tuple[List[Item], int]:
    """Build pallets of this template until one comes out empty.

    Returns the unplaced packages and the index of the next pallet.
    """
    index = first_index

    while remaining:
        packed: PackingResult = pack(pallet, remaining)
        if not packed.placements:
            break

        placed_ids = {placement.item_id for placement in packed.placements}
        weights = {item.id: item.weight for item in remaining}
        result.pallets.append(
            PackedPallet(
                id=f"{prefix}-{index}",
                placements=packed.placements,
                fill_rate_volume=packed.fill_rate_volume,
                fill_rate_weight=packed.fill_rate_weight,
                used_weight=sum(weights[placement_id] for placement_id in placed_ids),
            )
        )
        remaining = [item for item in remaining if item.id not in placed_ids]
        index += 1

    return remaining, index


def pack_into_pallets(
    pallet: Bin,
    items: List[Item],
    prefix: str = "palette",
    ceiling_height: Optional[float] = None,
) -> PalletizationResult:
    """Fill as many pallets as needed using the best placement per pallet.

    The underlying deterministic heuristic orders packages by volume and uses
    extreme points.  After a pallet is filled, only the packages it could not
    take are sent to the next one.

    ``ceiling_height`` is the tallest load the hold can actually take (its
    interior height, less the pallet floor). A package taller than the
    format's reference load height would otherwise never ship, however many
    containers were added — that reference is a build default, not the limit
    of the hold. Such a package therefore gets a pallet of its own, raised to
    its own height: it travels alone, which is what one does with an
    oversized load. The raised pallet is never a licence to stack higher than
    the usual build height.
    """
    result = PalletizationResult()
    remaining, next_index = _fill(pallet, list(items), prefix, 1, result)

    if remaining and ceiling_height:
        remaining, next_index = _raise_for_tall(
            pallet, remaining, prefix, next_index, ceiling_height, result
        )

    result.unplaced_ids = [item.id for item in remaining]
    return result


def _raise_for_tall(
    pallet: Bin,
    remaining: List[Item],
    prefix: str,
    first_index: int,
    ceiling_height: float,
    result: PalletizationResult,
) -> Tuple[List[Item], int]:
    """Build a dedicated pallet for each load too tall for the template.

    One load per pallet: the height only yields to get that load shipped, not
    as a licence to stack higher than usual.
    """
    index = first_index
    still_out: List[Item] = []

    for item in remaining:
        needed = item.dimensions.height
        if needed <= pallet.dimensions.height or needed > ceiling_height:
            # Height is not what blocks, or the hold will not take it.
            still_out.append(item)
            continue

        alone = Bin(
            dimensions=Dimensions(
                length=pallet.dimensions.length,
                width=pallet.dimensions.width,
                height=needed,
            ),
            max_weight=pallet.max_weight,
        )
        packed = pack(alone, [item])
        if not packed.placements:
            still_out.append(item)
            continue

        result.pallets.append(
            PackedPallet(
                id=f"{prefix}-{index}",
                placements=packed.placements,
                fill_rate_volume=packed.fill_rate_volume,
                fill_rate_weight=packed.fill_rate_weight,
                used_weight=item.weight,
            )
        )
        index += 1

    return still_out, index
