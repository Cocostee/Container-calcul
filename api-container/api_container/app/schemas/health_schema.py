"""Health contract - response schema for the health check endpoint."""
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Health check response.

    Attributes:
        status (str): Overall application status ("ok").
        database (str): Database connectivity, "up" or "down".

    """

    status: str
    database: str
