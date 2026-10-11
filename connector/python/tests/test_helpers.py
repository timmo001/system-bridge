"""Test the helpers module."""

from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.helpers import (
    battery_time_remaining,
    camera_in_use,
    cpu_power_per_cpu,
    cpu_speed,
    cpu_usage_per_cpu,
    display_refresh_rate,
    display_resolution_horizontal,
    display_resolution_vertical,
    gpu_core_clock_speed,
    gpu_fan_speed,
    gpu_memory_clock_speed,
    gpu_memory_free,
    gpu_memory_used,
    gpu_memory_used_percentage,
    gpu_power_usage,
    gpu_temperature,
    gpu_usage_percentage,
    memory_free,
    memory_used,
    partition_usage,
)
from systembridgeconnector.models.modules import ModulesData

EMPTY_MODULES_DATA = ModulesData()


@pytest.mark.asyncio
async def test_battery_time_remaining(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test battery time remaining."""
    with patch(
        "systembridgeconnector.helpers.utcnow",
        return_value=datetime(2024, 1, 1, 0, 0, 0, 0, tzinfo=UTC),
    ):
        assert battery_time_remaining(mock_modules_data) == snapshot
        assert battery_time_remaining(EMPTY_MODULES_DATA) is None


@pytest.mark.asyncio
async def test_camera_in_use(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test camera in use."""
    assert camera_in_use(mock_modules_data) == snapshot
    assert camera_in_use(EMPTY_MODULES_DATA) is None


@pytest.mark.asyncio
async def test_cpu_speed(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test CPU speed."""
    assert cpu_speed(mock_modules_data) == snapshot
    assert cpu_speed(EMPTY_MODULES_DATA) is None


@pytest.mark.asyncio
async def test_cpu_power_per_cpu(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test CPU power per CPU."""
    assert cpu_power_per_cpu(mock_modules_data, 0) == snapshot
    assert cpu_power_per_cpu(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_cpu_usage_per_cpu(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test CPU usage per CPU."""
    assert cpu_usage_per_cpu(mock_modules_data, 0) == snapshot
    assert cpu_usage_per_cpu(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_display_resolution_horizontal(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test display resolution horizontal."""
    assert display_resolution_horizontal(mock_modules_data, 0) == snapshot
    assert display_resolution_horizontal(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_display_resolution_vertical(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test display resolution vertical."""
    assert display_resolution_vertical(mock_modules_data, 0) == snapshot
    assert display_resolution_vertical(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_display_refresh_rate(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test display refresh rate."""
    assert display_refresh_rate(mock_modules_data, 0) == snapshot
    assert display_refresh_rate(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_core_clock_speed(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU core clock speed."""
    assert gpu_core_clock_speed(mock_modules_data, 0) == snapshot
    assert gpu_core_clock_speed(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_fan_speed(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU fan speed."""
    assert gpu_fan_speed(mock_modules_data, 0) == snapshot
    assert gpu_fan_speed(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_memory_clock_speed(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU memory clock speed."""
    assert gpu_memory_clock_speed(mock_modules_data, 0) == snapshot
    assert gpu_memory_clock_speed(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_memory_free(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU memory free."""
    assert gpu_memory_free(mock_modules_data, 0) == snapshot
    assert gpu_memory_free(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_memory_used(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU memory used."""
    assert gpu_memory_used(mock_modules_data, 0) == snapshot
    assert gpu_memory_used(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_memory_used_percentage(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU memory used percentage."""
    assert gpu_memory_used_percentage(mock_modules_data, 0) == snapshot
    assert mock_modules_data.gpus
    mock_modules_data.gpus[0].memory_used = None
    assert gpu_memory_used_percentage(mock_modules_data, 0) is None
    assert gpu_memory_used_percentage(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_power_usage(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU power usage."""
    assert gpu_power_usage(mock_modules_data, 0) == snapshot
    assert gpu_power_usage(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_temperature(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU temperature."""
    assert gpu_temperature(mock_modules_data, 0) == snapshot
    assert gpu_temperature(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_gpu_usage_percentage(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test GPU usage percentage."""
    assert gpu_usage_percentage(mock_modules_data, 0) == snapshot
    assert gpu_usage_percentage(EMPTY_MODULES_DATA, 0) is None


@pytest.mark.asyncio
async def test_memory_free(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test memory free."""
    assert memory_free(mock_modules_data) == snapshot
    assert memory_free(EMPTY_MODULES_DATA) is None


@pytest.mark.asyncio
async def test_memory_used(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test memory used."""
    assert memory_used(mock_modules_data) == snapshot
    assert memory_used(EMPTY_MODULES_DATA) is None


@pytest.mark.asyncio
async def test_partition_usage(
    snapshot: SnapshotAssertion,
    mock_modules_data: ModulesData,
) -> None:
    """Test partition usage."""
    assert partition_usage(mock_modules_data, 0, 0) == snapshot
    assert partition_usage(EMPTY_MODULES_DATA, 0, 0) is None
