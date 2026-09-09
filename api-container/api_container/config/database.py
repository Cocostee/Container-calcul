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
    _upgrade_placement_results_table()


def _upgrade_placement_results_table() -> None:
    """Bring a plan table created before the multi-container model up to date.

    The project has no migration framework: ``create_all`` creates missing
    tables but never alters an existing one. A volume that ran the previous
    version therefore keeps the single-container shape, where the plan was a
    flat ``placements`` list, and every new plan would fail to insert.

    Two things are needed, both idempotent:

    * add the columns the current model writes;
    * lift the ``NOT NULL`` on the columns it no longer writes, otherwise the
      insert is rejected by constraints on data that has no meaning any more.

    A plan is a cache, always recomputable, so the legacy columns are left in
    place rather than dropped: nothing is lost by keeping them.
    """
    columns = {
        column["name"]: column
        for column in inspect(engine).get_columns("placement_results")
    }
    statements = []
    if "containers" not in columns:
        statements.append(
            "ALTER TABLE placement_results "
            "ADD COLUMN containers JSON NOT NULL DEFAULT '[]'"
        )
    if "unplaced_package_count" not in columns:
        statements.append(
            "ALTER TABLE placement_results "
            "ADD COLUMN unplaced_package_count INTEGER NOT NULL DEFAULT 0"
        )
    for legacy in ("placements", "unplaced_count"):
        column = columns.get(legacy)
        if column is not None and not column["nullable"]:
            statements.append(
                f"ALTER TABLE placement_results ALTER COLUMN {legacy} DROP NOT NULL"
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
