"""Application models - SQLAlchemy ORM entities.

Importing every model here guarantees they are registered on ``Base.metadata``
before ``create_all`` runs.
"""
from api_container.app.models.container_type import ContainerType
from api_container.app.models.package_line import PackageLine
from api_container.app.models.palette_type import PaletteType
from api_container.app.models.placement_result import PlacementResult
from api_container.app.models.project import Project
from api_container.app.models.project_container import ProjectContainer

__all__ = (
    "ContainerType",
    "PaletteType",
    "Project",
    "ProjectContainer",
    "PackageLine",
    "PlacementResult",
)
