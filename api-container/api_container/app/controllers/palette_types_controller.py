"""Controller - GET /palette-types."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api_container.app.schemas.palette_schema import PaletteTypeSchema
from api_container.app.services.reference_service import ReferenceService
from api_container.config.database import get_db

router = APIRouter()


@router.get(
    "/palette-types",
    response_model=List[PaletteTypeSchema],
    tags=["reference"],
    summary="List predefined palette types.",
)
def list_palette_types(db: Session = Depends(get_db)) -> List[PaletteTypeSchema]:
    """Return every predefined palette type."""
    return ReferenceService(db).list_palette_types()
