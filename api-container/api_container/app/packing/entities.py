"""Packing - pure business entities (no FastAPI, no DB).

Coordinate convention:
    * x axis -> container length (depth)
    * y axis -> container width
    * z axis -> container height (up, gravity along -z)
Every position is the back-bottom-left corner of the box.
"""
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass(frozen=True)
class Dimensions:
    """Axis-aligned box size in centimetres."""

    length: float
    width: float
    height: float

    @property
    def volume(self) -> float:
        """Return the box volume."""
        return self.length * self.width * self.height

    @property
    def largest(self) -> float:
        """Return the largest single dimension (used for tie-breaking)."""
        return max(self.length, self.width, self.height)


# The orientations we accept from a load: it stays upright, and settles for a
# flat quarter turn swapping length and width. Each carries a stable code,
# reported in the placement.
#
# Laying a carton on its side would gain room, but that is not what one does
# with a load: the bearing face changes, the label ends up underneath, and the
# plan cannot be handled. A load too large for the pallet in both directions
# does not go on it, rather than going on it standing up.
_ORIENTATIONS: Tuple[Tuple[int, Tuple[int, int, int]], ...] = (
    (0, (0, 1, 2)),
    (1, (1, 0, 2)),
)


@dataclass(frozen=True)
class Item:
    """One pallet to place (already exploded from its quantity)."""

    id: str
    dimensions: Dimensions
    weight: float
    stackable: bool = True
    """May make a flat quarter turn to be stowed.

    Never a tip onto its side: see ``_ORIENTATIONS``.
    """
    rotatable: bool = True

    @property
    def volume(self) -> float:
        """Return the item volume."""
        return self.dimensions.volume

    def orientations(self) -> List[Tuple[Dimensions, int]]:
        """Return allowed (dimensions, rotation_code) pairs, de-duplicated.

        A non-rotatable item keeps a single orientation (code 0). A rotatable
        one may also swap length and width, keeping its height. Symmetric
        footprints collapse duplicate orientations.
        """
        sides = (
            self.dimensions.length,
            self.dimensions.width,
            self.dimensions.height,
        )
        if not self.rotatable:
            return [(self.dimensions, 0)]

        result: List[Tuple[Dimensions, int]] = []
        seen: set = set()
        for code, (a, b, c) in _ORIENTATIONS:
            dims = (sides[a], sides[b], sides[c])
            if dims in seen:
                continue
            seen.add(dims)
            result.append((Dimensions(*dims), code))
        return result


@dataclass(frozen=True)
class Bin:
    """The container envelope and its weight capacity."""

    dimensions: Dimensions
    max_weight: float

    @property
    def volume(self) -> float:
        """Return the container volume."""
        return self.dimensions.volume


@dataclass(frozen=True)
class Placement:
    """Result entry: where and how an item was placed."""

    item_id: str
    x: float
    y: float
    z: float
    length: float
    width: float
    height: float
    rotation: int


@dataclass
class PackingResult:
    """Outcome of a packing run."""

    placements: List[Placement] = field(default_factory=list)
    unplaced_ids: List[str] = field(default_factory=list)
    fill_rate_volume: float = 0.0
    fill_rate_weight: float = 0.0
