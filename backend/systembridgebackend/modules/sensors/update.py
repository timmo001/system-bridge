"""System Bridge: Update Sensors"""
from sqlite3 import Connection

from systembridgebackend.modules import ModuleUpdateBase
from systembridgebackend.modules.sensors import Sensors


class SensorsUpdate(ModuleUpdateBase):
    """Sensors Update"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__(database, "sensors")
        self._sensors = Sensors()

    async def update_battery(self) -> None:
        """Update Battery Sensors"""
        for key, value in self._sensors.battery()._asdict().items():
            self._database.write("sensors", f"battery_{key}", value)

    async def update_fans(self) -> None:
        """Update Fan Sensors"""
        for key, value in self._sensors.fans()._asdict().items():
            self._database.write("sensors", f"fans_{key}", value)

    async def update_temperatures(self) -> None:
        """Update Temperature Sensors"""
        for key, value in self._sensors.temperatures()._asdict().items():
            self._database.write("sensors", f"temperatures_{key}", value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_battery()
        await self.update_fans()
        await self.update_temperatures()
