"""Database configuration - SQLAlchemy engine and session factory.

This module owns the low-level database plumbing (engine, session, declarative
base). Business logic never lives here: services obtain a session and delegate
data access to repositories.
"""
from typing import Iterator

from sqlalchemy import create_engine, inspect, text
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
    _upgrade_projects_table()
    _upgrade_placement_results_table()


def _upgrade_projects_table() -> None:
    """Add the selected pallet type to projects created before stage one."""
    columns = {column["name"] for column in inspect(engine).get_columns("projects")}
    if "pallet_type_id" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE projects ADD COLUMN pallet_type_id VARCHAR")
            )


def _upgrade_placement_results_table() -> None:
    """Add JSON detail columns on databases created before palletization.

    The project intentionally has no migration framework yet.  This guarded,
    idempotent upgrade keeps existing Docker volumes usable while the detailed
    stage-one result is added to the persisted optimization response.
    """
    columns = {
        column["name"] for column in inspect(engine).get_columns("placement_results")
    }
    statements = []
    if "pallets" not in columns:
        statements.append(
            "ALTER TABLE placement_results "
            "ADD COLUMN pallets JSON NOT NULL DEFAULT '[]'"
        )
    if "unplaced_package_count" not in columns:
        statements.append(
            "ALTER TABLE placement_results "
            "ADD COLUMN unplaced_package_count INTEGER NOT NULL DEFAULT 0"
        )
    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))


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
