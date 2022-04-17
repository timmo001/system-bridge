"""System Bridge: Update Battery"""
from sqlite3 import Connection

from systembridgebackend.modules import ModuleUpdateBase
from systembridgebackend.modules.battery import Battery


class BatteryUpdate(ModuleUpdateBase):
    """Battery Update"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__(database, "battery")
        self._battery = Battery()

    async def update_status(self) -> None:
        """Update Battery Status"""
        for key, value in self._battery.status().items():
            self._database.write("battery", key, value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_status()
