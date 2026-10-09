"""Test the memory module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.memory import FIXTURE_MEMORY
from systembridgeconnector.models.modules.memory import Memory


def test_memory(snapshot: SnapshotAssertion):
    """Test the memory model."""
    memory = FIXTURE_MEMORY
    assert isinstance(memory, Memory)
    assert memory == snapshot


def test_memory_dict(snapshot: SnapshotAssertion):
    """Test memory dict."""
    memory_dict = asdict(FIXTURE_MEMORY)
    assert isinstance(memory_dict, dict)
    assert memory_dict == snapshot

    memory_converted = Memory(**memory_dict)
    assert isinstance(memory_converted, Memory)
    assert memory_converted == snapshot(
        name="memory-dict-converted",
    )
