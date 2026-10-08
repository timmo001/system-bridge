"""Disks."""

from dataclasses import dataclass
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class DiskIOCounters:
    """Disk IO Counters."""

    read_count: int
    write_count: int
    read_bytes: int
    write_bytes: int
    read_time: int
    write_time: int


@filter_unexpected_fields
@dataclass(slots=True)
class DiskUsage:
    """Disk Usage."""

    total: int
    used: int
    free: int
    percent: float


@filter_unexpected_fields
@dataclass(slots=True)
class DiskPartition:
    """Disk Partition."""

    device: str
    mount_point: str
    filesystem_type: str
    options: str
    max_file_size: int
    max_path_length: int
    usage: DiskUsage | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.usage, dict):
            self.usage = DiskUsage(**self.usage)


@filter_unexpected_fields
@dataclass(slots=True)
class Disk:
    """Disk."""

    name: str
    partitions: list[DiskPartition]
    io_counters: DiskIOCounters | None = None
    temperature: float | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.partitions, list) and all(
            isinstance(item, dict) for item in self.partitions
        ):
            new_partitions: list[DiskPartition] = []
            for p in self.partitions:
                partition: dict = cast(dict, p)
                new_partitions.append(DiskPartition(**partition))
            self.partitions = new_partitions

        if isinstance(self.io_counters, dict):
            self.io_counters = DiskIOCounters(**self.io_counters)


@filter_unexpected_fields
@dataclass(slots=True)
class Disks:
    """Disks."""

    devices: list[Disk]
    io_counters: DiskIOCounters | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.devices, list) and all(
            isinstance(item, dict) for item in self.devices
        ):
            new_devices: list[Disk] = []
            for d in self.devices:
                device: dict = cast(dict, d)
                partitions: list[DiskPartition] = []
                for partition in device.get("partitions", []):
                    partitions.append(DiskPartition(**partition))
                io_counters = device.get("io_counters")
                new_devices.append(
                    Disk(
                        name=device["name"],
                        partitions=partitions,
                        io_counters=(
                            DiskIOCounters(**io_counters) if io_counters else None
                        ),
                        temperature=device.get("temperature"),
                    )
                )
            self.devices = new_devices

        if isinstance(self.io_counters, dict):
            self.io_counters = DiskIOCounters(**self.io_counters)
