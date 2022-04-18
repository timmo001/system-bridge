"""System Bridge: Modules Update"""
import asyncio
from sqlite3 import Connection

from systembridgebackend import Base
from systembridgebackend.modules.battery.update import BatteryUpdate
from systembridgebackend.modules.cpu.update import CPUUpdate
from systembridgebackend.modules.disk.update import DiskUpdate
from systembridgebackend.modules.memory.update import MemoryUpdate
from systembridgebackend.modules.network.update import NetworkUpdate
from systembridgebackend.modules.sensors.update import SensorsUpdate
from systembridgebackend.modules.system.update import SystemUpdate


class Update(Base):
    """Modules Update"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database  # pylint: disable=duplicate-code
        self._classes = [
            BatteryUpdate(self._database),
            CPUUpdate(self._database),
            DiskUpdate(self._database),
            MemoryUpdate(self._database),
            NetworkUpdate(self._database),
            SensorsUpdate(self._database),
            SystemUpdate(self._database),
        ]

    async def update_data(self) -> None:
        """Update Data"""
        self._logger.info("Update data")
        if not self._database.connected:
            self._database.connect()

        tasks = [cls.update_all_data() for cls in self._classes]
        asyncio.gather(*tasks)

        self._logger.info("Finished updating data")
