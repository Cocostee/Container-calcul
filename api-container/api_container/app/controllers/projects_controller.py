"""Controller - projects CRUD and optimization endpoints."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from api_container.app.schemas.placement_schema import (
    OptimizeRequest,
    OptimizeResponse,
    PlacementResultSchema,
)
from api_container.app.schemas.project_schema import (
    ProjectCreate,
    ProjectSchema,
    ProjectSummarySchema,
    ProjectUpdate,
)
from api_container.app.services.optimization_service import OptimizationService
from api_container.app.services.project_service import ProjectService
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
    """Create a project with its initial pallet lines."""
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
    """Return a project's configuration, pallets and last result."""
    return ProjectService(db).get_project(project_id)


@router.put(
    "/projects/{project_id}",
    response_model=ProjectSchema,
    tags=["projects"],
    summary="Update a project's configuration and pallets.",
)
def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
) -> ProjectSchema:
    """Replace a project's configuration and pallet lines."""
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
    summary="Compute and persist a placement for the current state.",
)
def optimize_project(
    project_id: uuid.UUID,
    payload: OptimizeRequest,
    db: Session = Depends(get_db),
) -> OptimizeResponse:
    """Run the packing algorithm and store its result."""
    return OptimizationService(db).optimize(project_id, payload)


@router.get(
    "/projects/{project_id}/result",
    response_model=PlacementResultSchema,
    tags=["projects"],
    summary="Get the last computed result of a project.",
)
def get_project_result(
    project_id: uuid.UUID, db: Session = Depends(get_db)
) -> PlacementResultSchema:
    """Return the most recent persisted placement result."""
    return OptimizationService(db).get_last_result(project_id)
