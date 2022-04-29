"""System Bridge: Modules Update"""
import asyncio

from systembridgeshared.base import Base
from systembridgeshared.database import Database

from systembridgebackend.modules.battery.update import BatteryUpdate
from systembridgebackend.modules.bridge.update import BridgeUpdate
from systembridgebackend.modules.cpu.update import CPUUpdate
from systembridgebackend.modules.disk.update import DiskUpdate
from systembridgebackend.modules.display.update import DisplayUpdate
from systembridgebackend.modules.gpu.update import GPUUpdate
from systembridgebackend.modules.memory.update import MemoryUpdate
from systembridgebackend.modules.network.update import NetworkUpdate
from systembridgebackend.modules.sensor.update import SensorUpdate
from systembridgebackend.modules.system.update import SystemUpdate


class Update(Base):
    """Modules Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database  # pylint: disable=duplicate-code

        self._classes = [
            {"name": "battery", "cls": BatteryUpdate(self._database)},
            {"name": "disk", "cls": DiskUpdate(self._database)},
            {"name": "display", "cls": DisplayUpdate(self._database)},
            {"name": "system", "cls": SystemUpdate(self._database)},
        ]
        self._classes_frequent = [
            {"name": "sensor", "cls": SensorUpdate(self._database)},
            {"name": "cpu", "cls": CPUUpdate(self._database)},
            {"name": "gpu", "cls": GPUUpdate(self._database)},
            {"name": "memory", "cls": MemoryUpdate(self._database)},
            {"name": "network", "cls": NetworkUpdate(self._database)},
        ]
        BridgeUpdate(self._database)

    async def _update(
        self,
        class_obj: dict,
        updated_callback: callable,
    ) -> None:
        """Update"""
        await class_obj["cls"].update_all_data()
        await updated_callback(class_obj["name"])

    async def update_data(
        self,
        updated_callback: callable,
    ) -> None:
        """Update Data"""
        self._logger.info("Update data")
        if not self._database.connected:
            self._database.connect()

        tasks = [self._update(cls, updated_callback) for cls in self._classes]
        await asyncio.gather(*tasks)

        self._logger.info("Finished updating data")

    async def update_frequent_data(
        self,
        updated_callback: callable,
    ) -> None:
        """Update Data"""
        self._logger.info("Update frequent data")
        if not self._database.connected:
            self._database.connect()

        tasks = [self._update(cls, updated_callback) for cls in self._classes_frequent]
        await asyncio.gather(*tasks)

        self._logger.info("Finished updating frequent data")
