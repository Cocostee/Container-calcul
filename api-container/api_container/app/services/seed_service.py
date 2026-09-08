"""Service - seed the reference tables at startup (idempotent).

The sizes live in ``reference-data.json``, at the root of this service, so that
changing a container or a pallet is a matter of editing a file and restarting
the backend — no code, no SQL. The datasets below are the fallback used when
that file is missing or unreadable: the server must boot even then.

Rows are inserted **and updated**, so an edit actually reaches the database.
They are never deleted: saved projects refer to these ids, and dropping one
would tear a hole in their history.
"""
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Tuple, Union

from sqlalchemy.orm import Session

from api_container.app.models import ContainerType, PaletteType
from api_container.app.repositories.reference_repository import ReferenceRepository

log = logging.getLogger(__name__)

Row = Dict[str, Union[str, float]]

# api_container/app/services/seed_service.py -> service root
_SERVICE_ROOT = Path(__file__).resolve().parents[3]
REFERENCE_FILE = Path(
    os.environ.get("CONTAINER_REFERENCE_FILE", _SERVICE_ROOT / "reference-data.json")
)

# Dimensions expected from each family, all strictly positive.
_CONTAINER_FIELDS = ("length_cm", "width_cm", "height_cm", "max_weight_kg")
_PALLET_FIELDS = (
    "length_cm",
    "width_cm",
    "height_cm",
    "default_load_height_cm",
    "max_weight_kg",
)

# Fallback datasets, identical to the shipped file.
DEFAULT_CONTAINER_TYPES: List[Row] = [
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

DEFAULT_PALETTE_TYPES: List[Row] = [
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


def _valid(row: object, fields: Tuple[str, ...], kind: str) -> bool:
    """A usable entry: an id, a name, positive dimensions."""
    if not isinstance(row, dict):
        log.warning("Reference %s ignored: not an object (%r).", kind, row)
        return False

    identifier = str(row.get("id") or "").strip()
    if not identifier:
        log.warning("Reference %s ignored: missing 'id'.", kind)
        return False
    if not str(row.get("name") or "").strip():
        log.warning("Reference %s '%s' ignored: missing 'name'.", kind, identifier)
        return False

    for field in fields:
        value = row.get(field)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            log.warning(
                "Reference %s '%s' ignored: '%s' is not a number.",
                kind,
                identifier,
                field,
            )
            return False
        if value <= 0:
            log.warning(
                "Reference %s '%s' ignored: '%s' must be positive.",
                kind,
                identifier,
                field,
            )
            return False

    return True


def _keep(rows: object, fields: Tuple[str, ...], kind: str) -> List[Row]:
    """Keep only the usable entries, reporting the others."""
    if not isinstance(rows, list):
        log.warning("Reference '%s' section is not a list; ignored.", kind)
        return []
    return [
        {"id": str(row["id"]).strip(), "name": str(row["name"]).strip(), **{
            field: float(row[field]) for field in fields
        }}
        for row in rows
        if _valid(row, fields, kind)
    ]


def load_reference_data() -> Tuple[List[Row], List[Row]]:
    """Read the reference sizes, or return the fallback datasets."""
    if not REFERENCE_FILE.is_file():
        log.info(
            "No reference file at %s; using the built-in sizes.", REFERENCE_FILE
        )
        return DEFAULT_CONTAINER_TYPES, DEFAULT_PALETTE_TYPES

    try:
        raw = json.loads(REFERENCE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        log.warning(
            "Reference file %s unreadable (%s); using the built-in sizes.",
            REFERENCE_FILE,
            error,
        )
        return DEFAULT_CONTAINER_TYPES, DEFAULT_PALETTE_TYPES

    containers = _keep(raw.get("containers"), _CONTAINER_FIELDS, "container")
    pallets = _keep(raw.get("pallets"), _PALLET_FIELDS, "pallet")

    # A file leaving nothing usable must not empty the application: we fall
    # back to the shipped dataset, and say so.
    if not containers:
        log.warning("No usable container in %s; using the built-in sizes.", REFERENCE_FILE)
        containers = DEFAULT_CONTAINER_TYPES
    if not pallets:
        log.warning("No usable pallet in %s; using the built-in sizes.", REFERENCE_FILE)
        pallets = DEFAULT_PALETTE_TYPES

    return containers, pallets


def seed_reference_data(db: Session) -> None:
    """Insert missing reference rows and refresh the ones already there.

    Safe to run on every startup: an unchanged file is a no-op.
    """
    repo = ReferenceRepository(db)
    containers, pallets = load_reference_data()
    inserted = 0
    updated = 0

    for data in containers:
        existing = repo.get_container_type(str(data["id"]))
        if existing is None:
            repo.add(ContainerType(**data))
            inserted += 1
        elif _apply(existing, data):
            updated += 1

    for data in pallets:
        existing = repo.get_palette_type(str(data["id"]))
        if existing is None:
            repo.add(PaletteType(**data))
            inserted += 1
        elif _apply(existing, data):
            updated += 1

    db.commit()
    log.info(
        "Reference seed complete from %s (%d new, %d updated).",
        REFERENCE_FILE if REFERENCE_FILE.is_file() else "built-in sizes",
        inserted,
        updated,
    )


def _apply(entity: object, data: Row) -> bool:
    """Align an existing row with the file. True when it changed."""
    changed = False
    for field, value in data.items():
        if field == "id":
            continue
        if getattr(entity, field) != value:
            setattr(entity, field, value)
            changed = True
    return changed
