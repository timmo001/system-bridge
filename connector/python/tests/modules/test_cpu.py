"""Test the CPU module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.cpu import FIXTURE_CPU
from systembridgeconnector.models.modules.cpu import CPU, PerCPU


def test_cpu(snapshot: SnapshotAssertion):
    """Test the CPU model."""
    cpu = FIXTURE_CPU
    assert isinstance(cpu, CPU)
    assert cpu == snapshot


def test_cpu_dict(snapshot: SnapshotAssertion):
    """Test CPU dict."""
    cpu_dict = asdict(FIXTURE_CPU)
    assert isinstance(cpu_dict, dict)
    assert cpu_dict == snapshot

    cpu_converted = CPU(**cpu_dict)
    assert isinstance(cpu_converted, CPU)
    assert cpu_converted == snapshot(
        name="cpu-dict-converted",
    )


def test_cpu_per_cpu_dict(snapshot: SnapshotAssertion):
    """Test CPU PerCPU dict."""
    assert isinstance(FIXTURE_CPU.per_cpu, list)

    per_cpu = FIXTURE_CPU.per_cpu[0]
    per_cpu_dict = asdict(per_cpu)
    assert isinstance(per_cpu_dict, dict)
    assert per_cpu_dict == snapshot

    per_cpu_converted = PerCPU(**per_cpu_dict)
    assert isinstance(per_cpu_converted, PerCPU)
    assert per_cpu_converted == snapshot(
        name="per-cpu-dict-converted",
    )
