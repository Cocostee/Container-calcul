"""Tests du chargement des tailles de référence depuis le fichier de config.

Le fichier est le point d'entrée du client pour changer un conteneur ou une
palette : il doit être tolérant sans être laxiste. Une entrée fautive ne doit
jamais empêcher le serveur de démarrer, et une valeur corrigée doit atteindre
la base — l'amorçage a longtemps inséré sans mettre à jour, ce qui rendait le
fichier inopérant sur une base déjà remplie.
"""
import json

import pytest

from api_container.app.models import ContainerType, PaletteType
from api_container.app.services import seed_service
from api_container.app.services.seed_service import (
    DEFAULT_CONTAINER_TYPES,
    DEFAULT_PALETTE_TYPES,
    load_reference_data,
    seed_reference_data,
)

CONTENEUR = {
    "id": "test-20",
    "name": "Vingt pieds d'essai",
    "length_cm": 500,
    "width_cm": 200,
    "height_cm": 220,
    "max_weight_kg": 20000,
}

PALETTE = {
    "id": "test-epal",
    "name": "Palette d'essai",
    "length_cm": 120,
    "width_cm": 80,
    "height_cm": 14.4,
    "default_load_height_cm": 100,
    "max_weight_kg": 1500,
}


@pytest.fixture
def reference_file(tmp_path, monkeypatch):
    """Écrit un fichier de référence et le fait lire par le service."""

    def write(payload):
        path = tmp_path / "reference-data.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        monkeypatch.setattr(seed_service, "REFERENCE_FILE", path)
        return path

    return write


# --- Lecture du fichier ---------------------------------------------------


def test_un_fichier_valide_est_lu_tel_quel(reference_file):
    reference_file({"containers": [CONTENEUR], "pallets": [PALETTE]})

    containers, pallets = load_reference_data()

    assert [entry["id"] for entry in containers] == ["test-20"]
    assert [entry["id"] for entry in pallets] == ["test-epal"]
    assert containers[0]["height_cm"] == 220


def test_les_cles_inconnues_du_fichier_sont_ignorees(reference_file):
    """Le fichier livré porte un « _lisez-moi » : il ne doit pas gêner."""
    reference_file(
        {
            "_lisez-moi": ["une note", "sur deux lignes"],
            "containers": [CONTENEUR],
            "pallets": [PALETTE],
        }
    )

    containers, pallets = load_reference_data()

    assert len(containers) == 1
    assert len(pallets) == 1


def test_un_fichier_absent_rend_les_tailles_livrees(tmp_path, monkeypatch):
    monkeypatch.setattr(
        seed_service, "REFERENCE_FILE", tmp_path / "nulle-part.json"
    )

    containers, pallets = load_reference_data()

    assert containers is DEFAULT_CONTAINER_TYPES
    assert pallets is DEFAULT_PALETTE_TYPES


def test_un_fichier_illisible_rend_les_tailles_livrees(tmp_path, monkeypatch):
    path = tmp_path / "casse.json"
    path.write_text("{ ceci n'est pas du JSON", encoding="utf-8")
    monkeypatch.setattr(seed_service, "REFERENCE_FILE", path)

    containers, pallets = load_reference_data()

    assert containers is DEFAULT_CONTAINER_TYPES
    assert pallets is DEFAULT_PALETTE_TYPES


# --- Validation des entrées ----------------------------------------------


@pytest.mark.parametrize(
    "faute",
    [
        {"id": ""},
        {"name": ""},
        {"length_cm": 0},
        {"width_cm": -10},
        {"height_cm": "haut"},
        {"max_weight_kg": None},
    ],
)
def test_une_entree_fautive_est_ecartee_sans_emporter_les_autres(
    reference_file, faute
):
    mauvais = {**CONTENEUR, "id": "mauvais", **faute}
    reference_file(
        {"containers": [CONTENEUR, mauvais], "pallets": [PALETTE]}
    )

    containers, _ = load_reference_data()

    assert [entry["id"] for entry in containers] == ["test-20"]


def test_une_cote_manquante_ecarte_l_entree(reference_file):
    sans_hauteur = {key: value for key, value in CONTENEUR.items() if key != "height_cm"}
    reference_file({"containers": [sans_hauteur], "pallets": [PALETTE]})

    containers, _ = load_reference_data()

    # Plus rien d'exploitable : on retombe sur le jeu livré plutôt que de
    # laisser l'application sans aucune taille.
    assert containers is DEFAULT_CONTAINER_TYPES


def test_une_section_vide_rend_les_tailles_livrees(reference_file):
    reference_file({"containers": [], "pallets": [PALETTE]})

    containers, pallets = load_reference_data()

    assert containers is DEFAULT_CONTAINER_TYPES
    assert [entry["id"] for entry in pallets] == ["test-epal"]


def test_une_section_qui_n_est_pas_une_liste_est_ignoree(reference_file):
    reference_file({"containers": {"id": "pas-une-liste"}, "pallets": [PALETTE]})

    containers, _ = load_reference_data()

    assert containers is DEFAULT_CONTAINER_TYPES


def test_les_cotes_deviennent_des_nombres_flottants(reference_file):
    reference_file(
        {
            "containers": [{**CONTENEUR, "length_cm": 500}],
            "pallets": [PALETTE],
        }
    )

    containers, _ = load_reference_data()

    assert isinstance(containers[0]["length_cm"], float)


# --- Écriture en base ----------------------------------------------------


def test_l_amorcage_insere_les_tailles_manquantes(db, reference_file):
    reference_file({"containers": [CONTENEUR], "pallets": [PALETTE]})

    seed_reference_data(db)

    assert db.query(ContainerType).count() == 1
    assert db.query(PaletteType).count() == 1


def test_l_amorcage_met_a_jour_une_taille_deja_presente(db, reference_file):
    """Le cœur du sujet : éditer le fichier doit atteindre la base."""
    reference_file({"containers": [CONTENEUR], "pallets": [PALETTE]})
    seed_reference_data(db)

    reference_file(
        {
            "containers": [{**CONTENEUR, "height_cm": 245, "name": "Rehaussé"}],
            "pallets": [PALETTE],
        }
    )
    seed_reference_data(db)

    entity = db.get(ContainerType, "test-20")
    assert entity.height_cm == 245
    assert entity.name == "Rehaussé"
    # Mise à jour, pas duplication.
    assert db.query(ContainerType).count() == 1


def test_l_amorcage_est_rejouable_sans_effet(db, reference_file):
    reference_file({"containers": [CONTENEUR], "pallets": [PALETTE]})

    seed_reference_data(db)
    seed_reference_data(db)
    seed_reference_data(db)

    assert db.query(ContainerType).count() == 1
    assert db.query(PaletteType).count() == 1


def test_une_taille_retiree_du_fichier_reste_en_base(db, reference_file):
    """Des projets enregistrés s'y réfèrent : on ne l'efface pas."""
    reference_file(
        {
            "containers": [CONTENEUR, {**CONTENEUR, "id": "test-40"}],
            "pallets": [PALETTE],
        }
    )
    seed_reference_data(db)

    reference_file({"containers": [CONTENEUR], "pallets": [PALETTE]})
    seed_reference_data(db)

    assert db.get(ContainerType, "test-40") is not None
