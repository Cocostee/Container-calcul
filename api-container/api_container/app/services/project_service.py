"""Service - project CRUD and mapping to API schemas."""
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from api_container.app.exceptions import (
    EntityNotFoundError,
    ValidationDomainError,
)
from api_container.app.models import PackageLine, Project, ProjectContainer
from api_container.app.repositories.project_repository import ProjectRepository
from api_container.app.repositories.reference_repository import ReferenceRepository
from api_container.app.schemas.palette_schema import (
    PackageLineCreate,
    PackageLineSchema,
)
from api_container.app.schemas.placement_schema import PlacementResultSchema
from api_container.app.schemas.project_schema import (
    ProjectContainerCreate,
    ProjectContainerSchema,
    ProjectCreate,
    ProjectSchema,
    ProjectUpdate,
)


class ProjectService:
    """Business rules for projects, their packages and their containers."""

    def __init__(self, db: Session) -> None:
        """Build the service around a request-scoped session."""
        self._db = db
        self._projects = ProjectRepository(db)
        self._reference = ReferenceRepository(db)

    def list_projects(self) -> List[Project]:
        """Return all projects for the project list (summary rows)."""
        return self._projects.list()

    def get_project(self, project_id: uuid.UUID) -> ProjectSchema:
        """Return a full project detail or raise if it does not exist."""
        return self._to_schema(self._require_project(project_id))

    def create_project(self, data: ProjectCreate) -> ProjectSchema:
        """Create a project with its packages and its containers."""
        project = Project(name=data.name)
        project.packages = [self._build_package(p) for p in data.packages]
        project.containers = self._build_containers(data.containers)
        self._projects.add(project)
        self._db.commit()
        self._db.refresh(project)
        return self._to_schema(project)

    def update_project(
        self, project_id: uuid.UUID, data: ProjectUpdate
    ) -> ProjectSchema:
        """Replace a project's packages and containers."""
        project = self._require_project(project_id)
        project.name = data.name
        # delete-orphan cascade removes the rows that are no longer listed.
        project.packages = [self._build_package(p) for p in data.packages]
        project.containers = self._build_containers(data.containers)
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

    def _build_containers(
        self, containers: List[ProjectContainerCreate]
    ) -> List[ProjectContainer]:
        """Build the container rows, numbered in loading order."""
        built: List[ProjectContainer] = []
        for position, data in enumerate(containers, start=1):
            self._validate_container_type(data.container_type_id)
            self._validate_pallet_type(data.pallet_type_id)
            built.append(
                ProjectContainer(
                    position=position,
                    container_type_id=data.container_type_id,
                    container_custom_dims=data.container_custom_dims,
                    pallet_type_id=data.pallet_type_id,
                )
            )
        return built

    def _validate_container_type(self, container_type_id: Optional[str]) -> None:
        if (
            container_type_id is not None
            and self._reference.get_container_type(container_type_id) is None
        ):
            raise ValidationDomainError(
                f"Unknown container type '{container_type_id}'"
            )

    def _validate_pallet_type(self, pallet_type_id: Optional[str]) -> None:
        if (
            pallet_type_id is not None
            and self._reference.get_palette_type(pallet_type_id) is None
        ):
            raise ValidationDomainError(f"Unknown pallet type '{pallet_type_id}'")

    @staticmethod
    def _build_package(data: PackageLineCreate) -> PackageLine:
        return PackageLine(
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
            packages=[PackageLineSchema.from_orm(p) for p in project.packages],
            containers=[
                ProjectContainerSchema.from_orm(c) for c in project.containers
            ],
            last_result=(
                PlacementResultSchema.from_orm(last_result)
                if last_result is not None
                else None
            ),
        )
