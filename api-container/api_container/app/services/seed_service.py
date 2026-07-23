"""Service - seed the reference tables at startup (idempotent)."""
import logging
from typing import Dict, List, Union

from sqlalchemy.orm import Session

from api_container.app.models import ContainerType, PaletteType
from api_container.app.repositories.reference_repository import ReferenceRepository

log = logging.getLogger(__name__)

# Frozen reference datasets (dimensions in cm, weights in kg). Kept here as the
# single source of truth for what gets seeded; no magic numbers elsewhere.
CONTAINER_TYPES: List[Dict[str, Union[str, float]]] = [
    {
        "id": "20ft-standard",
        "name": "Conteneur 20 pieds standard",
        "length_cm": 589,
        "width_cm": 235,
        "height_cm": 239,
        "max_weight_kg": 28230,
    },
    {
        "id": "40ft-standard",
        "name": "Conteneur 40 pieds standard",
        "length_cm": 1203,
        "width_cm": 235,
        "height_cm": 239,
        "max_weight_kg": 26500,
    },
    {
        "id": "40ft-high-cube",
        "name": "Conteneur 40 pieds High Cube",
        "length_cm": 1203,
        "width_cm": 235,
        "height_cm": 269,
        "max_weight_kg": 26500,
    },
    {
        "id": "45ft-high-cube",
        "name": "Conteneur 45 pieds High Cube",
        "length_cm": 1355,
        "width_cm": 235,
        "height_cm": 269,
        "max_weight_kg": 27600,
    },
]

PALETTE_TYPES: List[Dict[str, Union[str, float]]] = [
    {
        "id": "europe-epal",
        "name": "Palette Europe (EPAL)",
        "length_cm": 120,
        "width_cm": 80,
        "height_cm": 14.4,
        "default_load_height_cm": 100,
        "max_weight_kg": 1500,
    },
    {
        "id": "us-standard",
        "name": "Palette Standard US",
        "length_cm": 120,
        "width_cm": 100,
        "height_cm": 14.4,
        "default_load_height_cm": 100,
        "max_weight_kg": 1500,
    },
    {
        "id": "australian",
        "name": "Palette Australienne",
        "length_cm": 116.5,
        "width_cm": 116.5,
        "height_cm": 14.4,
        "default_load_height_cm": 100,
        "max_weight_kg": 1500,
    },
    {
        "id": "half-pallet",
        "name": "Demi-palette",
        "length_cm": 80,
        "width_cm": 60,
        "height_cm": 14.4,
        "default_load_height_cm": 80,
        "max_weight_kg": 750,
    },
]


def seed_reference_data(db: Session) -> None:
    """Insert missing reference rows. Safe to run on every startup."""
    repo = ReferenceRepository(db)
    inserted = 0

    for data in CONTAINER_TYPES:
        if repo.get_container_type(str(data["id"])) is None:
            repo.add(ContainerType(**data))
            inserted += 1

    for data in PALETTE_TYPES:
        if repo.get_palette_type(str(data["id"])) is None:
            repo.add(PaletteType(**data))
            inserted += 1

    db.commit()
    log.info("Reference seed complete (%d new rows).", inserted)
