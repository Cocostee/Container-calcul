"""Tests du service de répartition.

La promesse tenue ici est simple à énoncer et facile à trahir : **aucun colis
ne reste à quai**. Le service ajoute des conteneurs jusqu'à ce que le lot soit
embarqué, les enregistre sur le projet, et s'arrête net dès qu'un conteneur de
plus ne prendrait rien — sans quoi un colis hors gabarit ferait boucler la
répartition à l'infini.
"""
import uuid

import pytest

from api_container.app.exceptions import (
    EntityNotFoundError,
    ValidationDomainError,
)
from api_container.app.models import PackageLine, Project, ProjectContainer
from api_container.app.schemas.placement_schema import (
    ContainerDimensions,
    OptimizeContainerInput,
    OptimizePaletteInput,
    OptimizeRequest,
    PalletDimensions,
)
from api_container.app.services.optimization_service import OptimizationService

VINGT_PIEDS = ContainerDimensions(
    name="20 pieds",
    length_cm=589,
    width_cm=235,
    height_cm=239,
    max_weight_kg=28230,
)

EPAL = PalletDimensions(
    id="epal",
    label="Europe",
    length_cm=120,
    width_cm=80,
    base_height_cm=14.4,
    max_load_height_cm=100,
    max_weight_kg=1500,
)


def ligne(quantity, length=120, width=80, height=93, weight=300):
    return PackageLine(
        label="Charge",
        length_cm=length,
        width_cm=width,
        height_cm=height,
        weight_kg=weight,
        quantity=quantity,
        stackable=True,
        rotatable=True,
    )


@pytest.fixture
def projet(db):
    """Un projet d'un conteneur, avec son lot enregistré."""

    def build(quantity=40, containers=1, **kwargs):
        project = Project(name="Essai")
        project.packages.append(ligne(quantity, **kwargs))
        for position in range(1, containers + 1):
            project.containers.append(
                ProjectContainer(
                    position=position,
                    container_type_id="20ft",
                    pallet_type_id="epal",
                )
            )
        db.add(project)
        db.commit()
        return project

    return build


def requete(project, auto_extend=True, pallet=EPAL):
    """La requête que le front enverrait pour ce projet."""
    return OptimizeRequest(
        packages=[
            OptimizePaletteInput(
                instance_id=str(line.id),
                length_cm=line.length_cm,
                width_cm=line.width_cm,
                height_cm=line.height_cm,
                weight_kg=line.weight_kg,
                quantity=line.quantity,
                stackable=line.stackable,
                rotatable=line.rotatable,
            )
            for line in project.packages
        ],
        containers=[
            OptimizeContainerInput(
                id=entry.id, container=VINGT_PIEDS, pallet=pallet
            )
            for entry in project.containers
        ],
        auto_extend=auto_extend,
    )


# --- Aucun colis à quai ---------------------------------------------------


def test_l_extension_automatique_vide_le_quai(db, references, projet):
    project = projet(quantity=40)

    response = OptimizationService(db).optimize(project.id, requete(project))

    assert response.unplaced_package_count == 0
    assert len(response.containers) > 1


def test_les_conteneurs_ajoutes_sont_enregistres(db, references, projet):
    """Sinon le plan afficherait des conteneurs que le projet ignore."""
    project = projet(quantity=40)

    response = OptimizationService(db).optimize(project.id, requete(project))

    db.refresh(project)
    assert len(project.containers) == len(response.containers)
    positions = sorted(entry.position for entry in project.containers)
    assert positions == list(range(1, len(response.containers) + 1))


def test_les_conteneurs_ajoutes_copient_le_dernier_declare(
    db, references, projet
):
    project = projet(quantity=40)

    OptimizationService(db).optimize(project.id, requete(project))

    db.refresh(project)
    assert {entry.container_type_id for entry in project.containers} == {"20ft"}
    assert {entry.pallet_type_id for entry in project.containers} == {"epal"}


def test_sans_extension_le_reliquat_est_annonce(db, references, projet):
    project = projet(quantity=40)

    response = OptimizationService(db).optimize(
        project.id, requete(project, auto_extend=False)
    )

    assert len(response.containers) == 1
    assert response.unplaced_package_count > 0


def test_un_colis_hors_gabarit_ne_fait_pas_boucler_l_extension(
    db, references, projet
):
    """Une charge de 400 cm ne tient sur aucune palette : l'extension doit
    s'arrêter dès qu'un conteneur de plus ne prend rien."""
    project = projet(quantity=2, length=400, width=100, height=100)

    response = OptimizationService(db).optimize(project.id, requete(project))

    assert len(response.containers) == 1
    assert response.unplaced_package_count == 2


# --- Le plan rendu --------------------------------------------------------


def test_chaque_conteneur_du_plan_porte_son_rang_et_son_nom(
    db, references, projet
):
    project = projet(quantity=40)

    response = OptimizationService(db).optimize(project.id, requete(project))

    for index, load in enumerate(response.containers, start=1):
        assert load.position == index
        assert load.name.endswith(str(index))


def test_le_plan_decrit_les_palettes_montees(db, references, projet):
    project = projet(quantity=8)

    response = OptimizationService(db).optimize(project.id, requete(project))

    premier = response.containers[0]
    assert premier.pallets != []
    assert premier.pallet_label == "Europe"
    total = sum(pallet.package_count for pallet in premier.pallets)
    assert total == 8


def test_sans_palette_le_plan_ne_decrit_aucune_palette(db, references, projet):
    """Le cas d'un plan importé : les charges entrent telles quelles."""
    project = projet(quantity=8)

    response = OptimizationService(db).optimize(
        project.id, requete(project, pallet=None)
    )

    assert response.containers[0].pallets == []
    assert response.containers[0].placements != []


def test_le_plan_est_enregistre_et_relisible(db, references, projet):
    project = projet(quantity=8)
    service = OptimizationService(db)

    calcule = service.optimize(project.id, requete(project))
    relu = service.get_last_result(project.id)

    assert relu.unplaced_package_count == calcule.unplaced_package_count
    assert len(relu.containers) == len(calcule.containers)


def test_le_taux_de_remplissage_est_pondere_par_le_volume(db, references, projet):
    project = projet(quantity=40)

    response = OptimizationService(db).optimize(project.id, requete(project))

    assert 0 < response.fill_rate_volume <= 1
    # Le dernier conteneur est le moins garni : la moyenne se tient entre les
    # deux extrêmes.
    taux = [load.fill_rate_volume for load in response.containers]
    assert min(taux) <= response.fill_rate_volume <= max(taux)


# --- Les refus ------------------------------------------------------------


def test_un_projet_inconnu_est_refuse(db, references):
    with pytest.raises(EntityNotFoundError):
        OptimizationService(db).optimize(
            uuid.uuid4(),
            OptimizeRequest(
                packages=[],
                containers=[
                    OptimizeContainerInput(container=VINGT_PIEDS, pallet=EPAL)
                ],
            ),
        )


def test_un_plan_sans_conteneur_est_refuse(db, references, projet):
    project = projet(quantity=4)

    with pytest.raises(ValidationDomainError):
        OptimizationService(db).optimize(
            project.id, OptimizeRequest(packages=[], containers=[])
        )


def test_un_projet_sans_plan_n_a_pas_de_dernier_resultat(db, references, projet):
    project = projet(quantity=4)

    with pytest.raises(EntityNotFoundError):
        OptimizationService(db).get_last_result(project.id)
