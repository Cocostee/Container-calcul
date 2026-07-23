"""Packing - extreme point (anchor) management.

A simplified Extreme Point heuristic: candidate anchor points start at the
origin; each placed box spawns up to three new anchors on its free faces
(right, side, top). Points that fall outside the bin or inside an existing box
are discarded.
"""
from dataclasses import dataclass
from typing import List

from api_container.app.packing.entities import Bin

EPS = 1e-6


@dataclass(frozen=True)
class Point:
    """A candidate anchor point (back-bottom-left corner for a placement)."""

    x: float
    y: float
    z: float


@dataclass(frozen=True)
class PlacedBox:
    """An item already placed, kept for overlap and support checks."""

    x: float
    y: float
    z: float
    length: float
    width: float
    height: float
    stackable: bool

    @property
    def x_end(self) -> float:
        """Far x face."""
        return self.x + self.length

    @property
    def y_end(self) -> float:
        """Far y face."""
        return self.y + self.width

    @property
    def z_end(self) -> float:
        """Top z face."""
        return self.z + self.height


def initial_points() -> List[Point]:
    """Return the starting anchor list (single origin point)."""
    return [Point(0.0, 0.0, 0.0)]


def _is_inside(point: Point, box: PlacedBox) -> bool:
    """Return True if the point lies strictly inside the box footprint/volume."""
    return (
        box.x - EPS < point.x < box.x_end - EPS
        and box.y - EPS < point.y < box.y_end - EPS
        and box.z - EPS < point.z < box.z_end - EPS
    )


def update_points(
    points: List[Point],
    used: Point,
    box: PlacedBox,
    container: Bin,
    placed: List[PlacedBox],
) -> List[Point]:
    """Return the new anchor list after placing ``box`` at ``used``.

    The consumed anchor is removed, three new corner anchors are added, and any
    anchor now sitting outside the bin or inside a placed box is pruned.
    """
    candidates = [p for p in points if p != used]
    candidates.extend(
        [
            Point(box.x_end, box.y, box.z),
            Point(box.x, box.y_end, box.z),
            Point(box.x, box.y, box.z_end),
        ]
    )

    result: List[Point] = []
    for point in candidates:
        if (
            point.x > container.dimensions.length - EPS
            or point.y > container.dimensions.width - EPS
            or point.z > container.dimensions.height - EPS
        ):
            continue
        if any(_is_inside(point, existing) for existing in placed):
            continue
        if point not in result:
            result.append(point)
    return result
