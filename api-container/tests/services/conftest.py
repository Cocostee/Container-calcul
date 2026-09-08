"""Fond de session pour les tests de services.

Une base SQLite en mémoire suffit : les modèles n'emploient que des types
portables (``Uuid``, ``JSON`` de SQLAlchemy), donc le schéma se crée tel quel.
Chaque test part d'une base vide, sans dépendre d'un PostgreSQL en marche.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api_container.app import models  # noqa: F401  (enregistre les tables)
from api_container.app.models import ContainerType, PaletteType
from api_container.config.database import Base


@pytest.fixture
def db():
    """Une session sur une base neuve, refermée après le test."""
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, future=True)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def references(db):
    """Les tailles de référence habituelles, pour les services qui les lisent.

    Volontairement réduites à ce qui sert aux tests : deux conteneurs très
    différents et deux palettes, dont une trop petite pour un colis de
    120 × 80 — c'est ce cas qui a révélé le plus de défauts.
    """
    db.add_all(
        [
            ContainerType(
                id="20ft",
                name="20 pieds",
                length_cm=589,
                width_cm=235,
                height_cm=239,
                max_weight_kg=28230,
            ),
            ContainerType(
                id="40ft",
                name="40 pieds",
                length_cm=1203,
                width_cm=235,
                height_cm=239,
                max_weight_kg=26500,
            ),
            PaletteType(
                id="epal",
                name="Europe",
                length_cm=120,
                width_cm=80,
                height_cm=14.4,
                default_load_height_cm=100,
                max_weight_kg=1500,
            ),
            PaletteType(
                id="demi",
                name="Demi-palette",
                length_cm=80,
                width_cm=60,
                height_cm=14.4,
                default_load_height_cm=80,
                max_weight_kg=750,
            ),
        ]
    )
    db.commit()
    return db
