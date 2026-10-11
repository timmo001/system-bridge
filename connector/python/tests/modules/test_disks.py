"""Test the disks module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.disks import FIXTURE_DISKS
from systembridgeconnector.models.modules.disks import (
    Disk,
    DiskIOCounters,
    DiskPartition,
    Disks,
    DiskUsage,
)


def _test_disk_partition(partition: DiskPartition):
    assert isinstance(partition, DiskPartition)
    assert partition.device == "device"
    assert partition.mount_point == "mountpoint"
    assert partition.filesystem_type == "fstype"
    assert partition.options == "options"
    assert partition.max_file_size == 1
    assert partition.max_path_length == 2
    assert isinstance(partition.usage, DiskUsage)
    assert partition.usage.total == 1
    assert partition.usage.used == 2
    assert partition.usage.free == 3
    assert partition.usage.percent == 40.2


def _test_disk(disk: Disk):
    assert isinstance(disk, Disk)
    assert disk.name == "name"
    assert isinstance(disk.partitions, list)
    assert isinstance(disk.partitions[0], DiskPartition)
    _test_disk_partition(disk.partitions[0])
    assert isinstance(disk.io_counters, DiskIOCounters)
    assert disk.io_counters.read_bytes == 1
    assert disk.io_counters.write_bytes == 2
    assert disk.io_counters.read_count == 3
    assert disk.io_counters.write_count == 4
    assert disk.io_counters.read_time == 5
    assert disk.io_counters.write_time == 6


def test_disks(snapshot: SnapshotAssertion):
    """Test the disks model."""
    disks = FIXTURE_DISKS
    assert isinstance(disks, Disks)
    assert disks == snapshot


def test_disks_dict(snapshot: SnapshotAssertion):
    """Test disks dict."""
    disks_dict = asdict(FIXTURE_DISKS)
    assert isinstance(disks_dict, dict)
    assert disks_dict == snapshot

    disks_converted = Disks(**disks_dict)
    assert isinstance(disks_converted, Disks)
    assert disks_converted == snapshot(
        name="disks-dict-converted",
    )


def test_disks_devices_dict(snapshot: SnapshotAssertion):
    """Test disks devices dict."""
    disk_dict = asdict(FIXTURE_DISKS.devices[0])
    assert isinstance(disk_dict, dict)
    assert disk_dict == snapshot

    disk_converted = Disk(**disk_dict)
    assert isinstance(disk_converted, Disk)
    assert disk_converted == snapshot(
        name="disks-devices-dict-converted",
    )


def test_disks_devices_partition_dict(snapshot: SnapshotAssertion):
    """Test disks devices partition dict."""
    partition_dict = asdict(FIXTURE_DISKS.devices[0].partitions[0])
    assert isinstance(partition_dict, dict)
    assert partition_dict == snapshot

    partition_converted = DiskPartition(**partition_dict)
    assert isinstance(partition_converted, DiskPartition)
    assert partition_converted == snapshot(
        name="disks-devices-partition-dict-converted",
    )
