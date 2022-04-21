"""System Bridge: Update Sensors"""
from systembridgebackend.database import Database
from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.sensors import Sensors


class SensorsUpdate(ModuleUpdateBase):
    """Sensors Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "sensors")
        self._sensors = Sensors()

    async def update_fans(self) -> None:
        """Update Fan Sensors"""
        if data := self._sensors.fans():
            for key, value in data.items():
                self._database.write("sensors", f"fans_{key}", value)

    async def update_temperatures(self) -> None:
        """Update Temperature Sensors"""
        if data := self._sensors.temperatures():
            for key, value in data.items():
                self._database.write("sensors", f"temperatures_{key}", value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_fans()
        await self.update_temperatures()
