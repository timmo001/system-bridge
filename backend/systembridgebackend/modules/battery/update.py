"""System Bridge: Update Battery"""
import asyncio

from systembridgeshared.common import camel_to_snake
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Battery as DatabaseModel

from ..base import ModuleUpdateBase
from . import Battery


class BatteryUpdate(ModuleUpdateBase):
    """Battery Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._battery = Battery()

    async def update_sensors(self) -> None:
        """Update Battery Sensors"""
        if data := self._battery.sensors():
            for key, value in data._asdict().items():
                # From status
                if key in ("percent", "power_plugged"):
                    continue
                if key == "secsleft":
                    value = str(float(value))
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=f"sensors_{key}",
                        value=value,
                    ),
                )

    async def update_status(self) -> None:
        """Update Battery Status"""
        if data := self._battery.status():
            for key, value in data.items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=camel_to_snake(key),
                        value=value,
                    ),
                )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_sensors(),
                self.update_status(),
            ]
        )
