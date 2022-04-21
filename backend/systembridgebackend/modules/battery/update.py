"""System Bridge: Update Battery"""
from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.database import Database
from systembridgebackend.modules.battery import Battery


class BatteryUpdate(ModuleUpdateBase):
    """Battery Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "battery")
        self._battery = Battery()

    async def update_sensors(self) -> None:
        """Update Battery Sensors"""
        if data := self._battery.sensors():
            for key, value in data._asdict().items():
                self._database.write("battery", f"sensors_{key}", value)

    async def update_status(self) -> None:
        """Update Battery Status"""
        for key, value in self._battery.status().items():
            self._database.write("battery", key, value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_sensors()
        await self.update_status()
