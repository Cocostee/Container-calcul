"""Application implementation - Health controller.

Route only: validates nothing beyond the injected session, delegates the
connectivity check to the service, and maps the result to the response schema.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api_container.app.schemas.health_schema import HealthResponse
from api_container.app.services.health_service import check_database
from api_container.config.database import get_db

router = APIRouter()


@router.get(
    "/health",
    tags=["health"],
    response_model=HealthResponse,
    summary="Liveness check including database connectivity.",
    status_code=200,
)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    """Return application status and database connectivity."""
    database_up = check_database(db)
    return HealthResponse(status="ok", database="up" if database_up else "down")
