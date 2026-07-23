"""Packing - Extreme Point heuristic packer (pure, framework-agnostic).

Algorithm (spec section 6):
    1. Sort items by decreasing volume (then largest side).
    2. Keep a list of anchor points, starting at the origin.
    3. For each item, test every allowed orientation at every anchor, keep the
       feasible placement with the best "deepest-bottom-left" score.
    4. Update anchors; mark the item unplaced if nothing is feasible.
    5. Compute volume and weight fill rates.
"""
from typing import List, Optional, Tuple

from api_container.app.packing.entities import (
    Bin,
    Dimensions,
    Item,
    Placement,
    PackingResult,
)
from api_container.app.packing.extreme_points import (
    EPS,
    PlacedBox,
    Point,
    initial_points,
    update_points,
)


def pack(container: Bin, items: List[Item]) -> PackingResult:
    """Place ``items`` into ``container`` and return the packing result."""
    ordered = sorted(
        items,
        key=lambda item: (item.volume, item.dimensions.largest),
        reverse=True,
    )

    placed: List[PlacedBox] = []
    placements: List[Placement] = []
    unplaced_ids: List[str] = []
    anchors = initial_points()
    used_weight = 0.0

    for item in ordered:
        if used_weight + item.weight > container.max_weight + EPS:
            unplaced_ids.append(item.id)
            continue

        best = _best_placement(item, anchors, placed, container)
        if best is None:
            unplaced_ids.append(item.id)
            continue

        anchor, dims, rotation = best
        box = PlacedBox(
            x=anchor.x,
            y=anchor.y,
            z=anchor.z,
            length=dims.length,
            width=dims.width,
            height=dims.height,
            stackable=item.stackable,
        )
        placed.append(box)
        placements.append(
            Placement(
                item_id=item.id,
                x=anchor.x,
                y=anchor.y,
                z=anchor.z,
                length=dims.length,
                width=dims.width,
                height=dims.height,
                rotation=rotation,
            )
        )
        used_weight += item.weight
        anchors = update_points(anchors, anchor, box, container, placed)

    return _build_result(container, placed, placements, unplaced_ids, used_weight)


def _best_placement(
    item: Item,
    anchors: List[Point],
    placed: List[PlacedBox],
    container: Bin,
) -> Optional[Tuple[Point, Dimensions, int]]:
    """Return the best feasible (anchor, dimensions, rotation) or None.

    "Best" minimises the deepest-bottom-left score (z, then x, then y).
    """
    best: Optional[Tuple[Point, Dimensions, int]] = None
    best_score: Optional[Tuple[float, float, float]] = None

    for anchor in anchors:
        for dims, rotation in item.orientations():
            if not _fits_bounds(anchor, dims, container):
                continue
            if _overlaps_any(anchor, dims, placed):
                continue
            if not _is_supported(anchor, dims, item, placed):
                continue
            score = (anchor.z, anchor.x, anchor.y)
            if best_score is None or score < best_score:
                best_score = score
                best = (anchor, dims, rotation)
    return best


def _fits_bounds(anchor: Point, dims: Dimensions, container: Bin) -> bool:
    """Return True if the box stays within the container walls."""
    return (
        anchor.x + dims.length <= container.dimensions.length + EPS
        and anchor.y + dims.width <= container.dimensions.width + EPS
        and anchor.z + dims.height <= container.dimensions.height + EPS
    )


def _overlaps_any(anchor: Point, dims: Dimensions, placed: List[PlacedBox]) -> bool:
    """Return True if the candidate box intersects any placed box."""
    x_end, y_end, z_end = (
        anchor.x + dims.length,
        anchor.y + dims.width,
        anchor.z + dims.height,
    )
    for box in placed:
        if (
            anchor.x < box.x_end - EPS
            and x_end > box.x + EPS
            and anchor.y < box.y_end - EPS
            and y_end > box.y + EPS
            and anchor.z < box.z_end - EPS
            and z_end > box.z + EPS
        ):
            return True
    return False


def _is_supported(
    anchor: Point, dims: Dimensions, item: Item, placed: List[PlacedBox]
) -> bool:
    """Return True if the box rests on the floor or a valid stack.

    Stacking rule (see spec section 11 decision): an item may only sit above
    the floor when it is itself stackable, its whole base is covered by the top
    faces of boxes at that height, and every supporting box is stackable.
    """
    if anchor.z <= EPS:
        return True

    if not item.stackable:
        return False

    base_area = dims.length * dims.width
    covered = 0.0
    for box in placed:
        if abs(box.z_end - anchor.z) > EPS:
            continue
        if not box.stackable:
            return False
        overlap = _footprint_overlap(anchor, dims, box)
        covered += overlap

    return covered >= base_area - EPS


def _footprint_overlap(anchor: Point, dims: Dimensions, box: PlacedBox) -> float:
    """Return the overlapping floor area between a candidate and a placed box."""
    dx = min(anchor.x + dims.length, box.x_end) - max(anchor.x, box.x)
    dy = min(anchor.y + dims.width, box.y_end) - max(anchor.y, box.y)
    if dx <= 0 or dy <= 0:
        return 0.0
    return dx * dy


def _build_result(
    container: Bin,
    placed: List[PlacedBox],
    placements: List[Placement],
    unplaced_ids: List[str],
    used_weight: float,
) -> PackingResult:
    """Assemble the final result with volume and weight fill rates."""
    used_volume = sum(box.length * box.width * box.height for box in placed)
    volume_rate = used_volume / container.volume if container.volume else 0.0
    weight_rate = (
        used_weight / container.max_weight if container.max_weight else 0.0
    )
    return PackingResult(
        placements=placements,
        unplaced_ids=unplaced_ids,
        fill_rate_volume=volume_rate,
        fill_rate_weight=weight_rate,
    )
