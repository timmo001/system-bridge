"""System Bridge: GPU"""
from __future__ import annotations

from systembridgeshared.base import Base
from systembridgeshared.const import (
    COLUMN_HARDWARE_NAME,
    COLUMN_HARDWARE_TYPE,
    COLUMN_KEY,
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_VALUE,
)
from systembridgeshared.database import Database


class GPU(Base):
    """GPU"""

    def get_gpus(
        self,
        database: Database,
    ) -> list[str]:
        """Get GPUs"""
        gpus = []
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and item[COLUMN_HARDWARE_NAME] not in gpus
            ):
                gpus.append(item[COLUMN_HARDWARE_NAME])
        return gpus

    def core_clock(
        self,
        database: Database,
    ) -> float | None:
        """GPU core clock"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "clock" in item[COLUMN_TYPE].lower()
                and "core" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU core clock: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def core_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU core load"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "load" in item[COLUMN_TYPE].lower()
                and "core" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU core load: %s = %s", item[COLUMN_KEY], item[COLUMN_VALUE]
                )
                return item[COLUMN_VALUE]
        return None

    def fan_speed(
        self,
        database: Database,
    ) -> float | None:
        """GPU fan speed"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "fan" in item[COLUMN_TYPE].lower()
            ):
                self._logger.debug(
                    "Found GPU fan speed: %s = %s", item[COLUMN_KEY], item[COLUMN_VALUE]
                )
                return item[COLUMN_VALUE]
        return None

    def memory_clock(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory clock"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "clock" in item[COLUMN_TYPE].lower()
                and "memory" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU memory clock: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def memory_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory load"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "load" in item[COLUMN_TYPE].lower()
                and "memory" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU memory load: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def memory_free(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory free"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "memory" in item[COLUMN_NAME].lower()
                and "free" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU memory free: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def memory_used(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory used"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "memory" in item[COLUMN_NAME].lower()
                and "used" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU memory used: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def memory_total(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory total"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "memory" in item[COLUMN_NAME].lower()
                and "total" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU memory total: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def power(
        self,
        database: Database,
    ) -> float | None:
        """GPU power usage"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "power" in item[COLUMN_TYPE].lower()
            ):
                self._logger.debug(
                    "Found GPU power: %s = %s", item[COLUMN_KEY], item[COLUMN_VALUE]
                )
                return item[COLUMN_VALUE]
        return None

    def temperature(
        self,
        database: Database,
    ) -> float | None:
        """GPU temperature"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                "gpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "temperature" in item[COLUMN_TYPE].lower()
                and "core" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found GPU temperature: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None
