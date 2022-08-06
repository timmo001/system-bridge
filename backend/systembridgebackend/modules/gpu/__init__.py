"""System Bridge: GPU"""
from __future__ import annotations

from typing import Optional

from systembridgeshared.base import Base
from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_sensors import (
    Sensors as SensorsDatabaseModel,
)


class GPU(Base):
    """GPU"""

    def get_gpus(
        self,
        database: Database,
    ) -> list[str]:
        """Get GPUs"""
        gpus = []
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and item.hardware_name not in gpus
            ):
                gpus.append(item.hardware_name)
        return gpus

    def core_clock(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU core clock"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "clock" in item.type.lower()
                and "core" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU core clock: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def core_load(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU core load"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "load" in item.type.lower()
                and "core" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug("Found GPU core load: %s = %s", item.key, item.value)
                return item.value
        return None

    def fan_speed(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU fan speed"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "fan" in item.type.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug("Found GPU fan speed: %s = %s", item.key, item.value)
                return item.value
        return None

    def memory_clock(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU memory clock"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "clock" in item.type.lower()
                and "memory" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU memory clock: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def memory_load(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU memory load"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "load" in item.type.lower()
                and "memory" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU memory load: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def memory_free(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU memory free"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "memory" in item.name.lower()
                and "free" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU memory free: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def memory_used(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU memory used"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "memory" in item.name.lower()
                and "used" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU memory used: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def memory_total(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU memory total"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "memory" in item.name.lower()
                and "total" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU memory total: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def power(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU power usage"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "power" in item.type.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug("Found GPU power: %s = %s", item.key, item.value)
                return item.value
        return None

    def temperature(
        self,
        database: Database,
        gpu_key: str,
    ) -> Optional[float]:
        """GPU temperature"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "gpu" in item.hardware_type.lower()
                and "temperature" in item.type.lower()
                and "core" in item.name.lower()
                and make_key(item.hardware_name) == gpu_key
            ):
                self._logger.debug(
                    "Found GPU temperature: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None
