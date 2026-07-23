"""Controller - GET /container-types."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api_container.app.schemas.container_schema import ContainerTypeSchema
from api_container.app.services.reference_service import ReferenceService
from api_container.config.database import get_db

router = APIRouter()


@router.get(
    "/container-types",
    response_model=List[ContainerTypeSchema],
    tags=["reference"],
    summary="List predefined container types.",
)
def list_container_types(db: Session = Depends(get_db)) -> List[ContainerTypeSchema]:
    """Return every predefined container type."""
    return ReferenceService(db).list_container_types()
