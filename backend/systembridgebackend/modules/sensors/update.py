"""System Bridge: Update Sensors"""
import asyncio
from systembridgeshared.base import Base
from systembridgeshared.common import make_key
from systembridgeshared.const import (
    COLUMN_HARDWARE_NAME,
    COLUMN_HARDWARE_TYPE,
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
                (COLUMN_TYPE, "TEXT"),
                (COLUMN_NAME, "TEXT"),
                (COLUMN_HARDWARE_TYPE, "TEXT"),
                (COLUMN_HARDWARE_NAME, "TEXT"),
                (COLUMN_VALUE, "TEXT"),
                (COLUMN_TIMESTAMP, "DOUBLE"),
            ],
        )
        self._sensors = Sensors()

    async def update_fans(self) -> None:
        """Update Fan Sensors"""
        if data := self._sensors.fans():
            for key, value in data.items():
                for subkey, subvalue in value.items():
                    self._database.write("sensors", f"fans_{key}_{subkey}", subvalue)

    async def update_temperatures(self) -> None:
        """Update Temperature Sensors"""
        if data := self._sensors.temperatures():
            for key, value in data.items():
                for subkey, subvalue in value.items():
                    self._database.write(
                        "sensors", f"temperatures_{key}_{subkey}", subvalue
                    )

    async def update_windows_sensors(self) -> None:
        """Update Windows Sensors"""
        if not (data := self._sensors.windows_sensors()):
            return
        if "hardware" in data and data["hardware"] is not None:
            for hardware in data["hardware"]:
                key_hardware = (
                    make_key(f"_{hardware['name']}") if "name" in hardware else None
                )
                for sensor in hardware["sensors"] or []:
                    key_sensor_name = make_key(sensor["name"])
                    key_sensor_type = make_key(sensor["type"])

                    self._database.write_sensor(
                        "sensors",
                        f"windows_hardware{key_hardware}_{key_sensor_name}_{key_sensor_type}",
                        sensor["type"],
                        sensor["name"],
                        hardware["type"],
                        hardware["name"],
                        sensor["value"] if "value" in sensor else None,
                    )

        if "nvidia" in data and data["nvidia"] is not None:
            for sensor, value in data["nvidia"].items():
                if isinstance(value, list):
                    counter = 0
                    for hardware in value:
                        key_hardware = (
                            make_key(f"_{hardware['name']}")
                            if "name" in hardware
                            else None
                        )
                        type_hardware = (
                            hardware["type"] if "type" in hardware else "NVIDIA"
                        )
                        name_hardware = hardware["name"] if "name" in hardware else None
                        if "DISPLAY" in name_hardware:
                            type_hardware = "Display"
                            name_hardware = (
                                f"Display {name_hardware.split('DISPLAY')[1]}"
                            )
                        for subkey, subvalue in hardware.items():
                            self._database.write_sensor(
                                "sensors",
                                f"windows_nvidia{key_hardware}_{sensor}_{counter}_{subkey}",
                                sensor,
                                subkey,
                                type_hardware,
                                name_hardware,
                                subvalue,
                            )
                        counter += 1
                else:
                    for subkey, subvalue in value.items():
                        self._database.write_sensor(
                            "sensors",
                            f"windows_nvidia_{sensor}_{subkey}",
                            sensor,
                            subkey,
                            value["type"] if "type" in value else "NVIDIA",
                            value["name"] if "name" in value else "NVIDIA",
                            subvalue,
                        )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_fans(),
                self.update_temperatures(),
                self.update_windows_sensors(),
            ]
        )
