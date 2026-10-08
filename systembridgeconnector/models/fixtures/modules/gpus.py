"""Fixtures for GPU models."""

from systembridgeconnector.models.modules.gpus import GPU

FIXTURE_GPUS = [
    GPU(
        id="abc123",
        name="name",
        core_clock=1000.0,
        core_load=100.0,
        fan_speed=100.0,
        memory_clock=1000.0,
        memory_load=100.0,
        memory_free=1000.0,
        memory_used=1000.0,
        memory_total=1000.0,
        power_usage=100.0,
        temperature=100.0,
    )
]
