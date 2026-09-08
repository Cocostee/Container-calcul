"""Tests des recommandations de taille.

Ce service a produit les défauts les plus visibles du projet, tous de la même
famille : annoncer un chiffre que le calcul n'allait pas tenir. Les tests
figent donc les trois règles apprises à la dure.
  1. tout voyage sur palette : un format est toujours recommandé ;
  2. une taille qui laisse des colis à quai n'est pas recommandée tant qu'une
     autre embarque tout ;
  3. les conteneurs sont comparés sur la base réellement retenue.
"""
import pytest

from api_container.app.packing import Dimensions, Item
from api_container.app.services.size_advice_service import SizeAdviceService


def colis(count, length=120, width=80, height=93, weight=300):
    """Un lot homogène de `count` colis."""
    return [
        Item(
            id="colis-%d" % index,
            dimensions=Dimensions(length, width, height),
            weight=weight,
        )
        for index in range(count)
    ]


class LignePersistee:
    """Ce qu'une ligne de colis expose au service, sans passer par l'ORM."""

    def __init__(self, quantity, identifier="ligne"):
        self.id = identifier
        self.quantity = quantity
        self.length_cm = 120
        self.width_cm = 80
        self.height_cm = 93
        self.weight_kg = 300
        self.stackable = True
        self.rotatable = True


@pytest.fixture
def service(references):
    return SizeAdviceService(references)


# --- Un format de palette est toujours recommandé ------------------------


def test_un_format_de_palette_est_toujours_recommande(service):
    advice = service.advise_for(colis(12))

    recommandes = [entry for entry in advice.pallets if entry.recommended]
    assert len(recommandes) == 1


def test_le_format_recommande_est_celui_qui_laisse_le_moins_a_quai(service):
    """La demi-palette ne peut pas porter un colis de 120 × 80."""
    advice = service.advise_for(colis(12))

    recommande = next(entry for entry in advice.pallets if entry.recommended)
    assert recommande.pallet_type_id == "epal"
    assert recommande.unplaced_package_count == 0


def test_un_format_trop_petit_annonce_son_reliquat(service):
    advice = service.advise_for(colis(12))

    demi = next(
        entry for entry in advice.pallets if entry.pallet_type_id == "demi"
    )
    assert demi.pallets_needed == 0
    assert demi.unplaced_package_count == 12


def test_un_format_est_recommande_meme_quand_aucun_n_embarque_tout(service):
    """Une charge de 400 cm ne tient sur aucune palette : il faut malgré tout
    conseiller le format qui en laisse le moins — l'absence de recommandation
    conduisait à proposer un chargement en vrac, qui n'existe pas."""
    lot = colis(8) + colis(2, length=400, width=100, height=100)

    advice = service.advise_for(lot)

    assert any(entry.recommended for entry in advice.pallets)


# --- Les conteneurs se comparent sur la base retenue ---------------------


def test_le_conteneur_recommande_embarque_tout_le_lot(service):
    advice = service.advise_for(colis(40), pallet_type_id="epal")

    recommande = next(entry for entry in advice.containers if entry.recommended)
    assert recommande.containers_needed > 0
    assert recommande.unplaced_package_count == 0


def test_une_taille_qui_laisse_a_quai_n_est_pas_recommandee(service):
    """Avec la demi-palette imposée, aucun conteneur ne prend quoi que ce
    soit : aucune taille ne peut alors se prétendre optimale."""
    advice = service.advise_for(colis(12), pallet_type_id="demi")

    for entry in advice.containers:
        assert entry.containers_needed == 0
        assert entry.unplaced_package_count == 12
    assert not any(entry.recommended for entry in advice.containers)


def test_le_format_de_palette_choisi_change_le_compte_de_conteneurs(service):
    """Le drapeau `palletize` distingue « pas de palette » de « choisis pour
    moi » : sans lui, le chiffre annoncé n'était pas celui du plan."""
    palettise = service.advise_for(colis(40), pallet_type_id="epal")
    en_vrac = service.advise_for(colis(40), palletize=False)

    besoin = {
        entry.container_type_id: entry.containers_needed
        for entry in palettise.containers
    }
    besoin_vrac = {
        entry.container_type_id: entry.containers_needed
        for entry in en_vrac.containers
    }
    # Sans palette, la cale se remplit mieux : jamais plus de conteneurs.
    for identifier, compte in besoin.items():
        assert besoin_vrac[identifier] <= compte


def test_un_lot_vide_ne_demande_aucun_conteneur(service):
    advice = service.advise_for([])

    assert all(entry.containers_needed == 0 for entry in advice.containers)


# --- L'éclatement des lignes --------------------------------------------


def test_une_ligne_donne_autant_de_colis_que_sa_quantite():
    items = SizeAdviceService.explode_lines([LignePersistee(quantity=4)])

    assert len(items) == 4
    assert {item.dimensions.length for item in items} == {120}


def test_les_colis_eclates_portent_des_identifiants_distincts():
    items = SizeAdviceService.explode_lines(
        [LignePersistee(quantity=2, identifier="a"), LignePersistee(quantity=3, identifier="b")]
    )

    assert len({item.id for item in items}) == 5


def test_une_ligne_sans_identifiant_prend_sa_position():
    """Une ligne de requete n'a ni `id` ni `instance_id` : son rang la nomme."""

    class Anonyme:
        quantity = 1
        length_cm = 120
        width_cm = 80
        height_cm = 93
        weight_kg = 300
        stackable = True
        rotatable = True

    items = SizeAdviceService.explode_lines([Anonyme()])

    assert items[0].id.startswith("line-0")
