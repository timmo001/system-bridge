"""System Bridge: Update Sensors"""
from systembridgeshared.base import Base
from systembridgeshared.const import (
    COLUMN_KEY,
    COLUMN_NAME,
    COLUMN_TIMESTAMP,
    COLUMN_TYPE,
    COLUMN_VALUE,
)
from systembridgeshared.database import Database

from systembridgebackend.modules.sensors import Sensors


class SensorsUpdate(Base):
    """Sensors Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__()

        self._database = database
        self._database.create_table(
            "sensors",
            [
                (COLUMN_KEY, "TEXT PRIMARY KEY"),
                (COLUMN_NAME, "TEXT"),
                (COLUMN_TYPE, "TEXT"),
                (COLUMN_VALUE, "TEXT"),
                (COLUMN_TIMESTAMP, "DOUBLE"),
            ],
        )
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
        if not (data := self._sensors.windows_sensors()):
            return
        if "hardware" in data and data["hardware"] is not None:
            for item in data["hardware"]:
                for key in item["sensors"] or []:
                    sensor_name = (
                        key["name"]
                        .replace(" ", "_", -1)
                        .replace("(", "", -1)
                        .replace(")", "", -1)
                        .lower()
                    )
                    sensor_type = (
                        key["type"]
                        .replace(" ", "_", -1)
                        .replace("(", "", -1)
                        .replace(")", "", -1)
                        .lower()
                    )

                    self._database.write_sensor(
                        "sensors",
                        f"windows_hardware_{sensor_name}_{sensor_type}",
                        key["name"],
                        sensor_type,
                        key["value"],
                    )

        if "nvidia" in data and data["nvidia"] is not None:
            for key, value in data["nvidia"].items():
                if isinstance(value, list):
                    counter = 0
                    for item in value:
                        for subkey, subvalue in item.items():
                            self._database.write_sensor(
                                "sensors",
                                f"windows_nvidia_{key}_{counter}_{subkey}",
                                subkey,
                                key,
                                subvalue,
                            )
                        counter += 1
                else:
                    for subkey, subvalue in value.items():
                        self._database.write_sensor(
                            "sensors",
                            f"windows_nvidia_{key}_{subkey}",
                            subkey,
                            key,
                            subvalue,
                        )

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_fans()
        await self.update_temperatures()
        await self.update_windows_sensors()
