"""Application implementation - ASGI."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api_container.config import settings
from api_container.config.database import SessionLocal, create_tables
from api_container.app.router import root_api_router
from api_container.app.utils import RedisClient
from api_container.app.services.seed_service import seed_reference_data
from api_container.app.exceptions import (
    DomainError,
    HTTPException,
    domain_exception_handler,
    http_exception_handler,
)


log = logging.getLogger(__name__)


async def on_startup() -> None:
    """Define FastAPI startup event handler.

    Resources:
        1. https://fastapi.tiangolo.com/advanced/events/#startup-event

    """
    log.debug("Execute FastAPI startup event handler.")
    # Ensure the schema exists and reference data is seeded (idempotent).
    create_tables()
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()
    if settings.USE_REDIS:
        await RedisClient.open_redis_client()


async def on_shutdown() -> None:
    """Define FastAPI shutdown event handler.

    Resources:
        1. https://fastapi.tiangolo.com/advanced/events/#shutdown-event

    """
    log.debug("Execute FastAPI shutdown event handler.")
    # Gracefully close utilities.
    if settings.USE_REDIS:
        await RedisClient.close_redis_client()


def get_application() -> FastAPI:
    """Initialize FastAPI application.

    Returns:
       FastAPI: Application object instance.

    """
    log.debug("Initialize FastAPI application node.")
    app = FastAPI(
        title=settings.PROJECT_NAME,
        debug=settings.DEBUG,
        version=settings.VERSION,
        docs_url=settings.DOCS_URL,
        on_startup=[on_startup],
        on_shutdown=[on_shutdown],
    )
    log.debug("Enable CORS for the front-end origins.")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    log.debug("Add application routes.")
    app.include_router(root_api_router)
    log.debug("Register global exception handlers.")
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(DomainError, domain_exception_handler)

    return app
