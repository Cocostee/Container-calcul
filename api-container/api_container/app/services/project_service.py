"""Service - project CRUD and mapping to API schemas."""
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from api_container.app.exceptions import (
    EntityNotFoundError,
    ValidationDomainError,
)
from api_container.app.models import PaletteInstance, Project
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.repositories.reference_repository import ReferenceRepository
from api_container.app.schemas.palette_schema import (
    PaletteInstanceCreate,
    PaletteInstanceSchema,
)
from api_container.app.schemas.placement_schema import PlacementResultSchema
from api_container.app.schemas.project_schema import (
    ProjectCreate,
    ProjectSchema,
    ProjectUpdate,
)


class ProjectService:
    """Business rules and orchestration for projects and their pallets."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._db = db
        self._projects = ProjectRepository(db)
        self._reference = ReferenceRepository(db)

    def list_projects(self) -> List[Project]:
        """Return all projects for the sidebar (summary rows)."""
        return self._projects.list()

    def get_project(self, project_id: uuid.UUID) -> ProjectSchema:
        """Return a full project detail or raise if it does not exist."""
        return self._to_schema(self._require_project(project_id))

    def create_project(self, data: ProjectCreate) -> ProjectSchema:
        """Create a project with its initial pallet lines."""
        self._validate_container(data.container_type_id)
        self._validate_pallet(data.pallet_type_id)
        project = Project(
            name=data.name,
            container_type_id=data.container_type_id,
            pallet_type_id=data.pallet_type_id,
            container_custom_dims=data.container_custom_dims,
        )
        project.palettes = [self._build_palette(p) for p in data.palettes]
        self._projects.add(project)
        self._db.commit()
        self._db.refresh(project)
        return self._to_schema(project)

    def update_project(
        self, project_id: uuid.UUID, data: ProjectUpdate
    ) -> ProjectSchema:
        """Replace a project's configuration and pallet lines."""
        project = self._require_project(project_id)
        self._validate_container(data.container_type_id)
        self._validate_pallet(data.pallet_type_id)
        project.name = data.name
        project.container_type_id = data.container_type_id
        project.pallet_type_id = data.pallet_type_id
        project.container_custom_dims = data.container_custom_dims
        # delete-orphan cascade removes the previous pallet rows.
        project.palettes = [self._build_palette(p) for p in data.palettes]
        self._db.commit()
        self._db.refresh(project)
        return self._to_schema(project)

    def delete_project(self, project_id: uuid.UUID) -> None:
        """Delete a project and everything attached to it."""
        project = self._require_project(project_id)
        self._projects.delete(project)
        self._db.commit()

    def _require_project(self, project_id: uuid.UUID) -> Project:
        project = self._projects.get(project_id)
        if project is None:
            raise EntityNotFoundError(f"Project '{project_id}' not found")
        return project

    def _validate_container(self, container_type_id: Optional[str]) -> None:
        if (
            container_type_id is not None
            and self._reference.get_container_type(container_type_id) is None
        ):
            raise ValidationDomainError(
                f"Unknown container type '{container_type_id}'"
            )

    def _validate_pallet(self, pallet_type_id: Optional[str]) -> None:
        if (
            pallet_type_id is not None
            and self._reference.get_palette_type(pallet_type_id) is None
        ):
            raise ValidationDomainError(f"Unknown pallet type '{pallet_type_id}'")

    @staticmethod
    def _build_palette(data: PaletteInstanceCreate) -> PaletteInstance:
        return PaletteInstance(
            palette_type_id=data.palette_type_id,
            label=data.label,
            length_cm=data.length_cm,
            width_cm=data.width_cm,
            height_cm=data.height_cm,
            weight_kg=data.weight_kg,
            quantity=data.quantity,
            stackable=data.stackable,
            rotatable=data.rotatable,
        )

    def _to_schema(self, project: Project) -> ProjectSchema:
        last_result = self._projects.get_last_result(project.id)
        return ProjectSchema(
            id=project.id,
            name=project.name,
            created_at=project.created_at,
            updated_at=project.updated_at,
            container_type_id=project.container_type_id,
            pallet_type_id=project.pallet_type_id,
            container_custom_dims=project.container_custom_dims,
            palettes=[PaletteInstanceSchema.from_orm(p) for p in project.palettes],
            last_result=(
                PlacementResultSchema.from_orm(last_result)
                if last_result is not None
                else None
            ),
        )
