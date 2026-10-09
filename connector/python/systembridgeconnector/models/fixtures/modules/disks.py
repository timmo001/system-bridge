"""Test fixtures for the disks module."""

from systembridgeconnector.models.modules.disks import (
    Disk,
    DiskIOCounters,
    DiskPartition,
    Disks,
    DiskUsage,
)

FIXTURE_DISKS = Disks(
    devices=[
        Disk(
            name="name",
            partitions=[
                DiskPartition(
                    device="device",
                    mount_point="mountpoint",
                    filesystem_type="fstype",
                    options="options",
                    max_file_size=1,
                    max_path_length=2,
                    usage=DiskUsage(
                        total=1,
                        used=2,
                        free=3,
                        percent=40.2,
                    ),
                ),
            ],
            io_counters=DiskIOCounters(
                read_bytes=1,
                write_bytes=2,
                read_count=3,
                write_count=4,
                read_time=5,
                write_time=6,
            ),
            temperature=45.5,
        )
    ],
    io_counters=DiskIOCounters(
        read_bytes=1,
        write_bytes=2,
        read_count=3,
        write_count=4,
        read_time=5,
        write_time=6,
    ),
)
