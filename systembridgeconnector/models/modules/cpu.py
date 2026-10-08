"""CPU."""

from dataclasses import dataclass
from typing import cast

from ..helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class CPUFrequency:
    """CPU Frequency."""

    current: float | None = None
    min: float | None = None
    max: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class CPUStats:
    """CPU Stats."""

    ctx_switches: int | None = None
    interrupts: int | None = None
    soft_interrupts: int | None = None
    syscalls: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class CPUTimes:
    """CPU Times."""

    user: float | None = None
    system: float | None = None
    idle: float | None = None
    interrupt: float | None = None
    dpc: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class PerCPU:
    """Per CPU."""

    id: int
    frequency: CPUFrequency | None = None
    power: float | None = None
    times: CPUTimes | None = None
    times_percent: CPUTimes | None = None
    usage: float | None = None
    voltage: float | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.frequency, dict):
            self.frequency = CPUFrequency(**self.frequency)

        if isinstance(self.times, dict):
            self.times = CPUTimes(**self.times)

        if isinstance(self.times_percent, dict):
            self.times_percent = CPUTimes(**self.times_percent)


@filter_unexpected_fields
@dataclass(slots=True)
class CPU:
    """CPU."""

    count: int | None = None
    name: str | None = None
    vendor: str | None = None
    family: str | None = None
    frequency: CPUFrequency | None = None
    load_average: float | None = None
    per_cpu: list[PerCPU] | None = None
    power: float | None = None
    stats: CPUStats | None = None
    temperature: float | None = None
    times: CPUTimes | None = None
    times_percent: CPUTimes | None = None
    usage: float | None = None
    voltage: float | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.frequency, dict):
            self.frequency = CPUFrequency(**self.frequency)

        if isinstance(self.per_cpu, list) and all(
            isinstance(item, dict) for item in self.per_cpu
        ):
            new_per_cpu: list[PerCPU] = []
            for p in self.per_cpu:
                per_cpu: dict = cast(dict, p)
                frequency = per_cpu.get("frequency")
                times = per_cpu.get("times")
                times_percent = per_cpu.get("times_percent")
                new_per_cpu.append(
                    PerCPU(
                        id=per_cpu["id"],
                        frequency=CPUFrequency(**frequency) if frequency else None,
                        power=per_cpu["power"],
                        times=CPUTimes(**times) if times else None,
                        times_percent=CPUTimes(**times_percent)
                        if times_percent
                        else None,
                        usage=per_cpu["usage"],
                        voltage=per_cpu["voltage"],
                    )
                )
            self.per_cpu = new_per_cpu

        if isinstance(self.stats, dict):
            self.stats = CPUStats(**self.stats)

        if isinstance(self.times, dict):
            self.times = CPUTimes(**self.times)

        if isinstance(self.times_percent, dict):
            self.times_percent = CPUTimes(**self.times_percent)
