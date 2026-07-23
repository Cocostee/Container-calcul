"""Packing algorithm - Extreme Point heuristic.

This package is intentionally free of any FastAPI or database dependency so it
can be unit-tested in isolation (spec section 9.3).
"""
from api_container.app.packing.entities import (
    Bin,
    Dimensions,
    Item,
    Placement,
    PackingResult,
)
from api_container.app.packing.packer import pack

__all__ = ("Bin", "Dimensions", "Item", "Placement", "PackingResult", "pack")
