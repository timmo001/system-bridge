"""System Bridge: Update Disk"""
import asyncio

from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.disk import Disk


class DiskUpdate(ModuleUpdateBase):
    """Disk Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "disk")
        self._disk = Disk()

    async def update_io_counters(self) -> None:
        """Update IO counters"""
        for key, value in self._disk.io_counters()._asdict().items():
            self._database.write("disk", f"io_counters_{key}", value)

    async def update_io_counters_per_disk(self) -> None:
        """Update IO counters per disk"""
        for key, value in self._disk.io_counters_per_disk().items():  # type: ignore
            for subkey, subvalue in value._asdict().items():
                self._database.write(
                    "disk", f"io_counters_per_disk_{key}_{subkey}", subvalue
                )

    async def update_partitions(self) -> None:
        """Update partitions"""
        partition_list = []
        for partition in self._disk.partitions():
            partition_list.append(partition.mountpoint)
            for key, value in partition._asdict().items():
                self._database.write(
                    "disk", f"partitions_{partition.mountpoint}_{key}", value
                )
        self._database.write("disk", "partitions", partition_list)

    async def update_usage(self) -> None:
        """Update usage"""
        for partition in self._disk.partitions():
            if data := self._disk.usage(partition.mountpoint):
                for key, value in data._asdict().items():
                    self._database.write(
                        "disk", f"usage_{partition.mountpoint}_{key}", value
                    )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_io_counters(),
                self.update_io_counters_per_disk(),
                self.update_partitions(),
                self.update_usage(),
            ]
        )
