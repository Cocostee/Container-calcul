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
from api_container.app.packing.palletization import (
    PackedPallet,
    PalletizationResult,
    pack_into_pallets,
)
from api_container.app.packing.multi_container import (
    ContainerSlot,
    LoadedContainer,
    MultiLoadResult,
    containers_needed,
    simulate_containers,
    load_containers,
)
from api_container.app.packing.packer import pack

__all__ = (
    "Bin",
    "Dimensions",
    "Item",
    "Placement",
    "PackingResult",
    "PackedPallet",
    "PalletizationResult",
    "ContainerSlot",
    "LoadedContainer",
    "MultiLoadResult",
    "containers_needed",
    "simulate_containers",
    "load_containers",
    "pack",
    "pack_into_pallets",
)
