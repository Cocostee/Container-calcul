"""Controller - projects CRUD and optimization endpoints."""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from api_container.app.schemas.placement_schema import (
    OptimizeRequest,
    OptimizeResponse,
    PlacementResultSchema,
    SizeAdviceRequest,
    SizeAdviceResponse,
)
from api_container.app.schemas.project_schema import (
    ProjectCreate,
    ProjectSchema,
    ProjectSummarySchema,
    ProjectUpdate,
)
from api_container.app.services.optimization_service import OptimizationService
from api_container.app.services.project_service import ProjectService
from api_container.app.services.size_advice_service import SizeAdviceService
from api_container.config.database import get_db

router = APIRouter()


@router.get(
    "/projects",
    response_model=List[ProjectSummarySchema],
    tags=["projects"],
    summary="List saved projects.",
)
def list_projects(db: Session = Depends(get_db)) -> List[ProjectSummarySchema]:
    """Return all projects, most recently updated first."""
    return ProjectService(db).list_projects()


@router.post(
    "/projects",
    response_model=ProjectSchema,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
    summary="Create a project.",
)
def create_project(
    payload: ProjectCreate, db: Session = Depends(get_db)
) -> ProjectSchema:
    """Create a project with its packages and containers."""
    return ProjectService(db).create_project(payload)


@router.get(
    "/projects/{project_id}",
    response_model=ProjectSchema,
    tags=["projects"],
    summary="Get a project's full detail.",
)
def get_project(
    project_id: uuid.UUID, db: Session = Depends(get_db)
) -> ProjectSchema:
    """Return a project's packages, containers and last plan."""
    return ProjectService(db).get_project(project_id)


@router.put(
    "/projects/{project_id}",
    response_model=ProjectSchema,
    tags=["projects"],
    summary="Replace a project's packages and containers.",
)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
) -> ProjectSchema:
    """Replace a project's packages and containers."""
    return ProjectService(db).update_project(project_id, payload)


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["projects"],
    summary="Delete a project.",
)
def delete_project(project_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    """Delete a project and everything attached to it."""
    ProjectService(db).delete_project(project_id)


@router.post(
    "/projects/{project_id}/optimize",
    response_model=OptimizeResponse,
    tags=["projects"],
    summary="Spread the packages across the containers and persist the plan.",
)
def optimize_project(
    project_id: uuid.UUID,
    payload: OptimizeRequest,
    db: Session = Depends(get_db),
) -> OptimizeResponse:
    """Load every container, adding some if the batch overflows."""
    return OptimizationService(db).optimize(project_id, payload)


@router.get(
    "/projects/{project_id}/result",
    response_model=PlacementResultSchema,
    tags=["projects"],
    summary="Get the last computed plan of a project.",
)
def get_project_result(
    project_id: uuid.UUID, db: Session = Depends(get_db)
) -> PlacementResultSchema:
    """Return the most recent persisted loading plan."""
    return OptimizationService(db).get_last_result(project_id)


@router.get(
    "/projects/{project_id}/size-advice",
    response_model=SizeAdviceResponse,
    tags=["projects"],
    summary="Rate every container and pallet size for a project's packages.",
)
def get_size_advice(
    project_id: uuid.UUID,
    pallet_type_id: Optional[str] = None,
    palletize: bool = True,
    db: Session = Depends(get_db),
) -> SizeAdviceResponse:
    """Return how many containers and pallets each reference size would need.

    ``palletize=false`` says the caller has chosen "no pallet": the container
    figures are then computed on already-built loads, like the plan will be.
    """
    return SizeAdviceService(db).advise(project_id, pallet_type_id, palletize)


@router.post(
    "/size-advice",
    response_model=SizeAdviceResponse,
    tags=["projects"],
    summary="Rate every container and pallet size for a batch of packages.",
)
def advise_sizes(
    payload: SizeAdviceRequest, db: Session = Depends(get_db)
) -> SizeAdviceResponse:
    """Recommend sizes for a batch that is not a project yet (import wizard)."""
    service = SizeAdviceService(db)
    return service.advise_for(
        service.explode_lines(payload.packages),
        payload.pallet_type_id,
        payload.palletize,
    )
