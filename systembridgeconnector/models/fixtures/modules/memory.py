"""Fixture for memory module."""

from systembridgeconnector.models.modules.memory import (
    Memory,
    MemorySwap,
    MemoryVirtual,
)

FIXTURE_MEMORY = Memory(
    swap=MemorySwap(
        total=1000,
        used=500,
        free=500,
        percent=50.0,
        sin=100,
        sout=100,
    ),
    virtual=MemoryVirtual(
        total=1000,
        available=500,
        percent=50.0,
        used=500,
        free=500,
        active=500,
        inactive=500,
        buffers=500,
        cached=500,
        wired=500,
        shared=500,
    ),
)
