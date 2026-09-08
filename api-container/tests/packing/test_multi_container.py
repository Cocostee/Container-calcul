"""Tests du chargement réparti sur plusieurs conteneurs.

Repères du gabarit utilisé ici : une palette de 100×100 avec 50 cm de charge
prend 4 colis de 50 cm de côté, et un conteneur de 200×100×100 empile
4 palettes — soit 16 colis par conteneur.
"""
from api_container.app.packing import Bin, Dimensions, Item
from api_container.app.packing.multi_container import (
    ContainerSlot,
    containers_needed,
    load_containers,
    simulate_containers,
)

PACKAGES_PER_PALLET = 4
PALLETS_PER_CONTAINER = 4
PACKAGES_PER_CONTAINER = PACKAGES_PER_PALLET * PALLETS_PER_CONTAINER


def _package(package_id: str, side: float = 50, weight: float = 10) -> Item:
    return Item(
        id=package_id,
        dimensions=Dimensions(side, side, side),
        weight=weight,
        rotatable=False,
    )


def _packages(count: int) -> list[Item]:
    return [_package(f"colis-{index}") for index in range(count)]


def _slot(slot_id: str, pallet_side: float = 100) -> ContainerSlot:
    return ContainerSlot(
        id=slot_id,
        container=Bin(dimensions=Dimensions(200, 100, 100), max_weight=10_000),
        pallet=Bin(
            dimensions=Dimensions(pallet_side, pallet_side, 50), max_weight=1_000
        ),
        pallet_base_height=0,
        pallet_label="Palette",
    )


def _shipped_ids(loaded) -> list[str]:
    return [
        placement.item_id
        for pallet in loaded.pallets
        for placement in pallet.placements
    ]


def test_le_second_conteneur_reprend_ce_que_le_premier_ne_prend_pas():
    packages = _packages(PACKAGES_PER_CONTAINER + PACKAGES_PER_PALLET)

    result = load_containers([_slot("c1"), _slot("c2")], packages)

    assert [len(loaded.pallets) for loaded in result.containers] == [
        PALLETS_PER_CONTAINER,
        1,
    ]
    assert result.unplaced_package_ids == []


def test_les_colis_restants_sont_signales_quand_le_conteneur_est_plein():
    packages = _packages(PACKAGES_PER_CONTAINER + PACKAGES_PER_PALLET)

    result = load_containers([_slot("c1")], packages)

    assert len(result.containers[0].pallets) == PALLETS_PER_CONTAINER
    assert len(result.unplaced_package_ids) == PACKAGES_PER_PALLET


def test_aucun_colis_n_est_charge_deux_fois():
    packages = _packages(30)

    result = load_containers([_slot("c1"), _slot("c2")], packages)

    shipped = [
        package_id
        for loaded in result.containers
        for package_id in _shipped_ids(loaded)
    ]
    assert len(shipped) == len(set(shipped))
    assert len(shipped) + len(result.unplaced_package_ids) == len(packages)


def test_ajouter_un_conteneur_ne_change_pas_le_chargement_des_precedents():
    packages = _packages(PACKAGES_PER_CONTAINER + PACKAGES_PER_PALLET)

    avant = load_containers([_slot("c1")], packages)
    apres = load_containers([_slot("c1"), _slot("c2")], packages)

    assert _shipped_ids(avant.containers[0]) == _shipped_ids(apres.containers[0])


def test_chaque_conteneur_palettise_avec_son_propre_format():
    # Le premier conteneur n'accepte que des palettes de 50 cm, une par colis :
    # il sature à 16 colis. Le second, en palettes de 100 cm, reprend le reste
    # en les regroupant par quatre.
    packages = _packages(20)

    result = load_containers(
        [_slot("etroit", pallet_side=50), _slot("large", pallet_side=100)],
        packages,
    )
    etroit, large = result.containers

    assert all(len(pallet.placements) == 1 for pallet in etroit.pallets)
    assert len(etroit.pallets) == 16
    assert [len(pallet.placements) for pallet in large.pallets] == [
        PACKAGES_PER_PALLET
    ]
    assert result.unplaced_package_ids == []


def test_un_colis_trop_grand_reste_a_quai_sans_bloquer_les_autres():
    packages = [_package("normal"), _package("enorme", side=500)]

    result = load_containers([_slot("c1")], packages)

    assert _shipped_ids(result.containers[0]) == ["normal"]
    assert result.unplaced_package_ids == ["enorme"]


def test_la_hauteur_retenue_est_celle_de_la_charge_reelle():
    # Un seul colis bas : la palette ne doit pas occuper toute sa hauteur
    # autorisée, sinon le conteneur en accepterait moins.
    result = load_containers([_slot("c1")], [_package("bas", side=10, weight=1)])

    assert result.containers[0].placements[0].height == 10


def test_un_conteneur_sans_reliquat_reste_vide():
    result = load_containers([_slot("c1"), _slot("c2")], [_package("seul")])

    assert len(result.containers[0].pallets) == 1
    assert result.containers[1].pallets == []
    assert result.containers[1].placements == []


def test_le_compte_de_conteneurs_necessaires_suit_le_volume():
    assert containers_needed(_slot("modele"), _packages(PACKAGES_PER_PALLET)) == 1
    assert containers_needed(_slot("modele"), _packages(PACKAGES_PER_CONTAINER)) == 1
    assert (
        containers_needed(_slot("modele"), _packages(PACKAGES_PER_CONTAINER + 1)) == 2
    )
    assert (
        containers_needed(_slot("modele"), _packages(PACKAGES_PER_CONTAINER * 2 + 1))
        == 3
    )


def test_un_format_qui_ne_peut_rien_prendre_rend_zero():
    # Aucun conteneur de ce format ne peut prendre la charge : on rend 0, ce
    # qui se distingue d'un « un seul suffit » et évite de boucler.
    assert containers_needed(_slot("modele"), [_package("enorme", side=500)]) == 0


def _slot_sans_palettisation(slot_id: str) -> ContainerSlot:
    """Un conteneur qui reçoit des charges déjà montées (plan importé)."""
    return ContainerSlot(
        id=slot_id,
        container=Bin(dimensions=Dimensions(200, 100, 100), max_weight=10_000),
        pallet=None,
    )


def test_les_charges_deja_montees_entrent_sans_palettisation():
    # Huit charges de 50 cm : 4 au sol, 4 empilées, aucune palette formée.
    packages = _packages(8)

    result = load_containers([_slot_sans_palettisation("c1")], packages)
    loaded = result.containers[0]

    assert loaded.pallets == []
    assert len(loaded.placements) == 8
    assert result.unplaced_package_ids == []


def test_le_reliquat_des_charges_montees_passe_au_conteneur_suivant():
    packages = _packages(20)

    result = load_containers(
        [_slot_sans_palettisation("c1"), _slot_sans_palettisation("c2")],
        packages,
    )

    charge = [len(loaded.placements) for loaded in result.containers]
    assert sum(charge) == 20
    assert charge[0] == 16
    assert result.unplaced_package_ids == []


def test_le_poids_charge_est_compte_sans_palettisation():
    result = load_containers(
        [_slot_sans_palettisation("c1")], [_package("un", weight=42)]
    )

    assert result.containers[0].used_weight == 42


def _slot_gabarit(slot_id: str = "gabarit") -> ContainerSlot:
    """Le gabarit de reference : 16 colis de 50 cm par conteneur."""
    return ContainerSlot(
        id=slot_id,
        container=Bin(dimensions=Dimensions(200, 100, 100), max_weight=10_000),
        pallet=Bin(dimensions=Dimensions(100, 100, 50), max_weight=1_000),
    )


def test_la_simulation_rend_le_compte_et_un_quai_vide():
    used, left = simulate_containers(_slot_gabarit(), _packages(20))

    assert used == 2
    assert left == []


def test_un_colis_plus_haut_que_la_hauteur_de_charge_part_quand_meme():
    # 90 cm depasse les 50 cm de charge du format, mais la cale en fait 100 :
    # la palette se monte plus haut plutot que de laisser le colis a quai. La
    # hauteur de reference est une habitude de montage, pas la limite.
    packages = _packages(4) + [_package("haut", side=90)]

    used, left = simulate_containers(_slot_gabarit(), packages)

    assert used == 1
    assert left == []


def test_un_colis_plus_large_que_la_palette_reste_a_quai():
    # 120 cm de cote ne tient sur aucune palette de 100x100, dans aucun sens :
    # ajouter des conteneurs n'y changerait rien, et il faut le dire.
    packages = _packages(4) + [_package("hors-gabarit", side=120)]

    used, left = simulate_containers(_slot_gabarit(), packages)

    assert used == 1
    assert left == ["hors-gabarit"]


def test_une_palette_montee_ne_se_couche_pas():
    # Une palette de 100x100 chargee a 50 cm mesure 50 cm de haut. Couchee,
    # elle tiendrait a plat dans une cale de 60 cm ; debout, non. Le plan doit
    # dire non.
    basse = ContainerSlot(
        id="basse",
        container=Bin(dimensions=Dimensions(200, 100, 60), max_weight=10_000),
        pallet=Bin(dimensions=Dimensions(100, 100, 50), max_weight=1_000),
    )

    result = load_containers([basse], _packages(4))

    assert result.containers[0].placements != []
    hauteurs = [
        placement.height for placement in result.containers[0].placements
    ]
    assert hauteurs == [50.0]


def test_la_simulation_et_le_compte_disent_la_meme_chose():
    packages = _packages(35)

    used, _ = simulate_containers(_slot_gabarit(), packages)

    assert used == containers_needed(_slot_gabarit(), packages)


def test_aucun_colis_ne_depasse_de_sa_palette():
    """Invariant : un colis reste dans l'emprise de sa palette.

    La hauteur de montage peut ceder devant la cale, jamais l'empreinte : une
    palette dont la charge deborde ne se manutentionne pas. Le lot melange des
    colis plus hauts que la hauteur de charge et des colis plus longs que la
    palette dans un sens, pour eprouver les deux passes de montage.
    """
    slot = ContainerSlot(
        id="c1",
        container=Bin(dimensions=Dimensions(600, 240, 240), max_weight=28_000),
        pallet=Bin(dimensions=Dimensions(120, 80, 100), max_weight=1_500),
        pallet_base_height=14.4,
    )
    packages = (
        [
            Item(
                id=f"haut-{index}",
                dimensions=Dimensions(110, 75, 115),
                weight=200,
            )
            for index in range(8)
        ]
        + [
            Item(
                id=f"long-{index}",
                dimensions=Dimensions(130, 70, 60),
                weight=150,
            )
            for index in range(6)
        ]
    )

    result = load_containers([slot], packages)
    loaded = result.containers[0]

    assert loaded.pallets != []
    for packed in loaded.pallets:
        for placement in packed.placements:
            assert placement.x >= 0 and placement.y >= 0 and placement.z >= 0
            assert placement.x + placement.length <= 120
            assert placement.y + placement.width <= 80

    # Et chaque palette chargee tient dans la hauteur de la cale.
    for placement in loaded.placements:
        assert placement.height <= 240


def test_une_palette_de_charges_non_gerbables_ne_se_gerbe_pas():
    """Le drapeau du colis remonte a la palette qu'il forme.

    Une palette de 100x100 chargee a 50 cm mesure 64.4 cm avec son plancher :
    la cale de 150 cm en empilerait deux. Si la charge refuse d'avoir quelque
    chose au-dessus, la palette le refuse aussi.
    """
    slot = ContainerSlot(
        id="c1",
        container=Bin(dimensions=Dimensions(100, 100, 150), max_weight=10_000),
        pallet=Bin(dimensions=Dimensions(100, 100, 50), max_weight=1_000),
        pallet_base_height=14.4,
    )
    charges = [
        Item(
            id=f"fragile-{index}",
            dimensions=Dimensions(100, 100, 50),
            weight=10,
            stackable=False,
        )
        for index in range(2)
    ]

    result = load_containers([slot], charges)
    loaded = result.containers[0]

    # Une seule palette entre : la seconde n'a pas le droit de monter dessus.
    assert len(loaded.placements) == 1
    assert len(result.unplaced_package_ids) == 1

    # Les memes charges gerbables : les deux palettes s'empilent.
    gerbables = [
        Item(id=f"ok-{index}", dimensions=Dimensions(100, 100, 50), weight=10)
        for index in range(2)
    ]
    empile = load_containers([slot], gerbables)

    assert len(empile.containers[0].placements) == 2
    assert empile.unplaced_package_ids == []
