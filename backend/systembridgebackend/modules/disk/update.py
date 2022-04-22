"""System Bridge: Update Disk"""
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
        for key, value in self._disk.io_counters_per_disk().items():
            for subkey, subvalue in value._asdict().items():
                self._database.write(
                    "disk", f"io_counters_per_disk_{key}_{subkey}", subvalue
                )

    async def update_partitions(self) -> None:
        """Update partitions"""
        for partition in self._disk.partitions():
            for key, value in partition._asdict().items():
                self._database.write(
                    "disk", f"partitions_{partition.mountpoint}_{key}", value
                )

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
        await self.update_io_counters()
        await self.update_io_counters_per_disk()
        await self.update_partitions()
        await self.update_usage()
