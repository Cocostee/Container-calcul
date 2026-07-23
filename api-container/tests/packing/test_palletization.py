"""Tests for the repeated-pallet packing orchestration."""
from api_container.app.packing import Bin, Dimensions, Item, pack_into_pallets


def _pallet() -> Bin:
    return Bin(dimensions=Dimensions(100, 100, 50), max_weight=1000)


def _item(item_id: str, length: float, width: float, height: float) -> Item:
    return Item(
        id=item_id,
        dimensions=Dimensions(length, width, height),
        weight=1,
        rotatable=False,
    )


def test_packages_spill_to_the_next_pallet_when_the_first_is_full():
    items = [_item(f"box-{index}", 50, 50, 50) for index in range(5)]

    result = pack_into_pallets(_pallet(), items)

    assert len(result.pallets) == 2
    assert [len(pallet.placements) for pallet in result.pallets] == [4, 1]
    assert result.unplaced_ids == []


def test_oversized_package_is_reported_after_all_feasible_packages_are_packed():
    items = [_item("fits", 50, 50, 50), _item("oversized", 101, 50, 50)]

    result = pack_into_pallets(_pallet(), items)

    assert len(result.pallets) == 1
    assert [placement.item_id for placement in result.pallets[0].placements] == [
        "fits"
    ]
    assert result.unplaced_ids == ["oversized"]
