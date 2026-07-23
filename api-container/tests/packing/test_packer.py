"""Unit tests for the Extreme Point packer (pure, no FastAPI/DB)."""
import math

from api_container.app.packing import Bin, Dimensions, Item, pack


def _bin(length=100.0, width=100.0, height=100.0, max_weight=10000.0) -> Bin:
    return Bin(
        dimensions=Dimensions(length=length, width=width, height=height),
        max_weight=max_weight,
    )


def _item(item_id, length, width, height, weight=1.0, stackable=True, rotatable=True):
    return Item(
        id=item_id,
        dimensions=Dimensions(length=length, width=width, height=height),
        weight=weight,
        stackable=stackable,
        rotatable=rotatable,
    )


def test_single_item_placed_at_origin():
    result = pack(_bin(), [_item("a", 50, 50, 50)])

    assert result.unplaced_ids == []
    assert len(result.placements) == 1
    placement = result.placements[0]
    assert (placement.x, placement.y, placement.z) == (0.0, 0.0, 0.0)
    assert math.isclose(result.fill_rate_volume, 0.125)


def test_item_larger_than_bin_is_unplaced():
    result = pack(_bin(100, 100, 100), [_item("big", 200, 50, 50, rotatable=False)])

    assert result.placements == []
    assert result.unplaced_ids == ["big"]
    assert result.fill_rate_volume == 0.0


def test_two_items_fill_bin_completely_side_by_side():
    container = _bin(100, 100, 100)
    items = [_item("a", 50, 100, 100), _item("b", 50, 100, 100)]

    result = pack(container, items)

    assert result.unplaced_ids == []
    assert len(result.placements) == 2
    assert math.isclose(result.fill_rate_volume, 1.0)
    xs = sorted(p.x for p in result.placements)
    assert xs == [0.0, 50.0]


def test_weight_limit_rejects_item():
    container = _bin(100, 100, 100, max_weight=100.0)
    items = [_item("heavy", 10, 10, 10, weight=80.0), _item("heavier", 10, 10, 10, weight=80.0)]

    result = pack(container, items)

    assert len(result.placements) == 1
    assert len(result.unplaced_ids) == 1
    assert result.fill_rate_weight <= 1.0


def test_non_rotatable_item_that_only_fits_rotated_is_unplaced():
    # Bin is short in x; the item only fits if its long side rotates onto y.
    container = _bin(60, 200, 200)
    flat = _item("flat", 200, 40, 40, rotatable=False)

    result = pack(container, [flat])

    assert result.unplaced_ids == ["flat"]


def test_rotatable_item_is_placed_by_rotating():
    container = _bin(60, 200, 200)
    flat = _item("flat", 200, 40, 40, rotatable=True)

    result = pack(container, [flat])

    assert result.unplaced_ids == []
    assert len(result.placements) == 1
    # Rotated so the 200 side no longer lies along x (length <= 60).
    assert result.placements[0].length <= 60 + 1e-6


def test_stacking_places_second_item_on_top():
    # Footprint only fits one item; height fits two -> the second stacks.
    container = _bin(100, 100, 100)
    items = [_item("bottom", 100, 100, 50), _item("top", 100, 100, 50)]

    result = pack(container, items)

    assert result.unplaced_ids == []
    zs = sorted(p.z for p in result.placements)
    assert zs == [0.0, 50.0]
    assert math.isclose(result.fill_rate_volume, 1.0)


def test_non_stackable_base_prevents_stacking():
    # The only base is non-stackable, so nothing may rest on top of it.
    container = _bin(100, 100, 100)
    items = [
        _item("bottom", 100, 100, 50, stackable=False),
        _item("top", 100, 100, 50, stackable=True),
    ]

    result = pack(container, items)

    assert len(result.placements) == 1
    assert result.unplaced_ids == ["top"]


def test_unsupported_placement_is_rejected():
    # A small item cannot float: with a single tall base occupying one corner,
    # a second item must sit on the floor, not mid-air.
    container = _bin(100, 100, 100)
    items = [_item("a", 50, 50, 100), _item("b", 50, 50, 20)]

    result = pack(container, items)

    for placement in result.placements:
        assert placement.z == 0.0 or placement.z + placement.height <= 100 + 1e-6
