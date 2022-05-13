"""System Bridge: Update Battery"""
import asyncio

from systembridgeshared.common import camel_to_snake
from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
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
                # From status
                if key == "percent":
                    continue
                self._database.write("battery", f"sensors_{key}", value)

    async def update_status(self) -> None:
        """Update Battery Status"""
        for key, value in self._battery.status().items():
            self._database.write("battery", camel_to_snake(key), value)

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_sensors(),
                self.update_status(),
            ]
        )
