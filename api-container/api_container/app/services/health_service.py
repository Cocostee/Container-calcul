"""Health service - infrastructure connectivity checks."""
import logging

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)


def check_database(db: Session) -> bool:
    """Verify database connectivity with a trivial query.

    Args:
        db (Session): An open database session.

    Returns:
        bool: True if the database answered, False if it could not be reached.

    """
    try:
        db.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        # Reported explicitly to the caller as a "down" status rather than
        # swallowed: the endpoint surfaces degraded health to the client.
        log.exception("Database connectivity check failed")
        return False
