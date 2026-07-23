"""Application configuration - root APIRouter.

Defines all FastAPI application endpoints.

Resources:
    1. https://fastapi.tiangolo.com/tutorial/bigger-applications

"""
from fastapi import APIRouter

from api_container.app.controllers import (
    container_types_controller,
    health_controller,
    palette_types_controller,
    projects_controller,
    ready,
)

root_api_router = APIRouter(prefix="/api")

root_api_router.include_router(ready.router, tags=["ready"])
root_api_router.include_router(health_controller.router, tags=["health"])
root_api_router.include_router(container_types_controller.router)
root_api_router.include_router(palette_types_controller.router)
root_api_router.include_router(projects_controller.router)
