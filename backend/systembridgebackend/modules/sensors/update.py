"""System Bridge: Update Sensors"""
from systembridgeshared.database import Database

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

    async def update_windows_sensors(self) -> None:
        """Update Windows Sensors"""
        data = self._sensors.windows_sensors()
        if not data:
            return
        if "hardware" in data and data["hardware"] is not None:
            for item in data["hardware"]:
                for key in item["sensors"] or []:
                    self._database.write(
                        "sensors",
                        f"windows_hardware_{key['id']}",
                        key["value"],
                    )

        if "nvidia" in data and data["nvidia"] is not None:
            for key, value in data["nvidia"].items():
                if isinstance(value, list):
                    counter = 0
                    for item in value:
                        for subkey, subvalue in item.items():
                            self._database.write(
                                "sensors",
                                f"windows_nvidia_{key}_{counter}_{subkey}",
                                subvalue,
                            )
                        counter += 1
                else:
                    for subkey, subvalue in value.items():
                        self._database.write(
                            "sensors",
                            f"windows_nvidia_{key}_{subkey}",
                            subvalue,
                        )

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_fans()
        await self.update_temperatures()
        await self.update_windows_sensors()
