"""Repository - projects, pallet instances and placement results."""
import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from api_container.app.models import PlacementResult, Project


class ProjectRepository:
    """Data access for projects and their related rows."""

    def __init__(self, db: Session) -> None:
        """Store the session used for queries."""
        self._db = db

    def list(self) -> List[Project]:
        """Return all projects, most recently updated first."""
        stmt = select(Project).order_by(Project.updated_at.desc())
        return list(self._db.scalars(stmt))

    def get(self, project_id: uuid.UUID) -> Optional[Project]:
        """Return a project by id, or None."""
        return self._db.get(Project, project_id)

    def add(self, project: Project) -> Project:
        """Stage a new project and assign its generated fields."""
        self._db.add(project)
        self._db.flush()
        return project

    def delete(self, project: Project) -> None:
        """Stage a project (and its cascade) for deletion."""
        self._db.delete(project)

    def add_result(self, result: PlacementResult) -> PlacementResult:
        """Stage a new placement result and assign generated fields."""
        self._db.add(result)
        self._db.flush()
        return result

    def get_last_result(self, project_id: uuid.UUID) -> Optional[PlacementResult]:
        """Return the most recent placement result for a project, or None."""
        stmt = (
            select(PlacementResult)
            .where(PlacementResult.project_id == project_id)
            .order_by(PlacementResult.computed_at.desc())
            .limit(1)
        )
        return self._db.scalars(stmt).first()
