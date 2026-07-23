"""Application implementation - business (domain) exceptions and handler.

Services raise these framework-agnostic errors; the handler registered in
asgi.py maps them to HTTP responses so controllers never deal with error codes.
"""
from fastapi import Request
from fastapi.responses import JSONResponse

from api_container.app.views import ErrorResponse


class DomainError(Exception):
    """Base class for business errors. Maps to HTTP 400 by default."""

    status_code: int = 400

    def __init__(self, message: str) -> None:
        """Store a human-readable message surfaced to the client."""
        self.message = message
        super().__init__(message)


class EntityNotFoundError(DomainError):
    """Raised when a requested entity does not exist. Maps to HTTP 404."""

    status_code = 404


class ValidationDomainError(DomainError):
    """Raised when a business rule rejects otherwise well-typed input."""

    status_code = 422


async def domain_exception_handler(
    request: Request, exception: DomainError
) -> JSONResponse:
    """Map a DomainError to a structured JSON error response."""
    return JSONResponse(
        status_code=exception.status_code,
        content=ErrorResponse(
            code=exception.status_code, message=exception.message
        ).dict(exclude_none=True),
    )
