"""Database configuration - SQLAlchemy engine and session factory.

This module owns the low-level database plumbing (engine, session, declarative
base). Business logic never lives here: services obtain a session and delegate
data access to repositories.
"""
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from api_container.config import settings

# ``pool_pre_ping`` transparently recycles connections dropped by the database,
# which avoids stale-connection errors after the container has been idle.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

# Declarative base shared by every ORM model (see app/models/).
Base = declarative_base()


def create_tables() -> None:
    """Create all ORM tables that do not exist yet.

    Models are imported here (not at module top) so that every mapper is
    registered on ``Base.metadata`` before ``create_all`` runs, while keeping
    this module free of a circular import with ``app/models``.
    """
    from api_container.app import models  # noqa: F401  (registers mappers)

    Base.metadata.create_all(bind=engine)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped database session.

    Yields:
        Session: An open SQLAlchemy session, closed automatically once the
            request handler returns.

    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
