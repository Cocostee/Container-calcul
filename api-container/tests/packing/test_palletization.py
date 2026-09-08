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


# --- Le cas rencontre en production ---------------------------------------
#
# Des colis de 120x80 hauts de 93 cm, une palette Australienne de 116.5x116.5
# avec 100 cm de charge, une cale de 269 cm. Le colis ne tient sur la palette
# dans aucun sens a plat. Le calcul l'a longtemps mis debout (120 cm de haut)
# et empile par deux, soit 240 cm de charge : place gagnee, plan inexecutable.


def _colis(item_id: str) -> Item:
    """Un colis du lot reel : 120x80, 93 cm de haut, rotatif."""
    return Item(
        id=item_id,
        dimensions=Dimensions(120, 80, 93),
        weight=897.6,
        rotatable=True,
    )


def test_un_colis_trop_grand_pour_la_palette_ne_se_met_pas_debout():
    australienne = Bin(
        dimensions=Dimensions(116.5, 116.5, 100), max_weight=1500
    )

    result = pack_into_pallets(
        australienne, [_colis(f"c-{index}") for index in range(4)],
        ceiling_height=269 - 14.4,
    )

    assert result.pallets == []
    assert len(result.unplaced_ids) == 4


def test_sur_la_bonne_palette_chaque_colis_voyage_seul():
    """93 + 93 depasse les 100 cm de charge : un colis par palette."""
    europe = Bin(dimensions=Dimensions(120, 80, 100), max_weight=1500)

    result = pack_into_pallets(
        europe, [_colis(f"c-{index}") for index in range(4)],
        ceiling_height=269 - 14.4,
    )

    assert len(result.pallets) == 4
    assert [len(pallet.placements) for pallet in result.pallets] == [1, 1, 1, 1]
    assert result.unplaced_ids == []


def test_la_palette_montee_haut_ne_porte_qu_une_charge():
    """La hauteur cede pour faire partir une charge, pas pour empiler."""
    europe = Bin(dimensions=Dimensions(120, 80, 100), max_weight=1500)
    trop_hauts = [
        Item(
            id=f"haut-{index}",
            dimensions=Dimensions(120, 80, 115),
            weight=200,
        )
        for index in range(3)
    ]

    result = pack_into_pallets(europe, trop_hauts, ceiling_height=254.6)

    assert len(result.pallets) == 3
    assert [len(pallet.placements) for pallet in result.pallets] == [1, 1, 1]
    assert result.unplaced_ids == []
