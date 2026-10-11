"""Helper functions."""

from collections.abc import Callable
import datetime as dt
from datetime import UTC, datetime, timedelta
from functools import partial

from .models.modules import ModulesData
from .models.modules.cpu import PerCPU
from .models.modules.displays import Display
from .models.modules.gpus import GPU

utcnow = partial(dt.datetime.now, UTC)


def battery_time_remaining(data: ModulesData) -> datetime | None:
    """Return the battery time remaining."""
    if data.battery and (battery_time := data.battery.time_remaining) is not None:
        return utcnow() + timedelta(seconds=battery_time)
    return None


def camera_in_use(data: ModulesData) -> bool | None:
    """Return if any camera is in use."""
    if data.system and data.system.camera_usage is not None:
        return len(data.system.camera_usage) > 0
    return None


def cpu_speed(data: ModulesData) -> float | None:
    """Return the CPU speed."""
    if (
        data.cpu
        and (cpu_frequency := data.cpu.frequency) is not None
        and (cpu_frequency.current) is not None
    ):
        return round(cpu_frequency.current / 1000, 2)
    return None


def with_per_cpu(func) -> Callable:
    """Wrap a function to ensure per CPU data is available."""

    def wrapper(data: ModulesData, index: int) -> float | None:
        """Wrap a function to ensure per CPU data is available."""
        if data.cpu and data.cpu.per_cpu is not None and index < len(data.cpu.per_cpu):
            return func(data.cpu.per_cpu[index])
        return None

    return wrapper


@with_per_cpu
def cpu_power_per_cpu(per_cpu: PerCPU) -> float | None:
    """Return CPU power per CPU."""
    return per_cpu.power


@with_per_cpu
def cpu_usage_per_cpu(per_cpu: PerCPU) -> float | None:
    """Return CPU usage per CPU."""
    return per_cpu.usage


def with_display(func) -> Callable:
    """Wrap a function to ensure a Display is available."""

    def wrapper(data: ModulesData, index: int) -> Display | None:
        """Wrap a function to ensure a Display is available."""
        if data.displays and index < len(data.displays):
            return func(data.displays[index])
        return None

    return wrapper


@with_display
def display_resolution_horizontal(display: Display) -> int | None:
    """Return the Display resolution horizontal."""
    return display.resolution_horizontal


@with_display
def display_resolution_vertical(display: Display) -> int | None:
    """Return the Display resolution vertical."""
    return display.resolution_vertical


@with_display
def display_refresh_rate(display: Display) -> float | None:
    """Return the Display refresh rate."""
    return display.refresh_rate


def with_gpu(func) -> Callable:
    """Wrap a function to ensure a GPU is available."""

    def wrapper(data: ModulesData, index: int) -> GPU | None:
        """Wrap a function to ensure a GPU is available."""
        if data.gpus and index < len(data.gpus):
            return func(data.gpus[index])
        return None

    return wrapper


@with_gpu
def gpu_core_clock_speed(gpu: GPU) -> float | None:
    """Return the GPU core clock speed."""
    return gpu.core_clock


@with_gpu
def gpu_fan_speed(gpu: GPU) -> float | None:
    """Return the GPU fan speed."""
    return gpu.fan_speed


@with_gpu
def gpu_memory_clock_speed(gpu: GPU) -> float | None:
    """Return the GPU memory clock speed."""
    return gpu.memory_clock


@with_gpu
def gpu_memory_free(gpu: GPU) -> float | None:
    """Return the free GPU memory."""
    return gpu.memory_free


@with_gpu
def gpu_memory_used(gpu: GPU) -> float | None:
    """Return the used GPU memory."""
    return gpu.memory_used


@with_gpu
def gpu_memory_used_percentage(gpu: GPU) -> float | None:
    """Return the used GPU memory percentage."""
    if (gpu.memory_used) is not None and (gpu.memory_total) is not None:
        return round(gpu.memory_used / gpu.memory_total * 100, 2)
    return None


@with_gpu
def gpu_power_usage(gpu: GPU) -> float | None:
    """Return the GPU power usage."""
    return gpu.power_usage


@with_gpu
def gpu_temperature(gpu: GPU) -> float | None:
    """Return the GPU temperature."""
    return gpu.temperature


@with_gpu
def gpu_usage_percentage(gpu: GPU) -> float | None:
    """Return the GPU usage percentage."""
    return gpu.core_load


def memory_free(data: ModulesData) -> float | None:
    """Return the free memory."""
    if (
        data.memory
        and (virtual := data.memory.virtual) is not None
        and (free := virtual.free) is not None
    ):
        return round(free / 1000**3, 2)
    return None


def memory_used(data: ModulesData) -> float | None:
    """Return the used memory."""
    if (
        data.memory
        and (virtual := data.memory.virtual) is not None
        and (used := virtual.used) is not None
    ):
        return round(used / 1000**3, 2)
    return None


def partition_usage(
    data: ModulesData,
    device_index: int,
    partition_index: int,
) -> float | None:
    """Return the used memory."""
    if (
        data.disks
        and (devices := data.disks.devices) is not None
        and device_index < len(devices)
        and (partitions := devices[device_index].partitions) is not None
        and partition_index < len(partitions)
        and (usage := partitions[partition_index].usage) is not None
    ):
        return usage.percent
    return None
