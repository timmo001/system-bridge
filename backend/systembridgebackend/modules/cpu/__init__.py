"""System Bridge: CPU"""
from __future__ import annotations

from typing import Optional

from psutil import (
    cpu_count,
    cpu_freq,
    cpu_percent,
    cpu_stats,
    cpu_times,
    cpu_times_percent,
    getloadavg,
)
from psutil._common import pcputimes, scpufreq, scpustats
from systembridgeshared.base import Base
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_sensors import (
    Sensors as SensorsDatabaseModel,
)


class CPU(Base):
    """CPU"""

    def count(self) -> int:
        """CPU count"""
        return cpu_count()

    def freq(self) -> scpufreq:
        """CPU frequency"""
        return cpu_freq()

    def freq_per_cpu(self) -> list[scpufreq]:  # pylint: disable=unsubscriptable-object
        """CPU frequency per CPU"""
        return cpu_freq(percpu=True)  # type: ignore

    def load_average(
        self,
    ) -> tuple[float, float, float]:  # pylint: disable=unsubscriptable-object
        """Get load average"""
        return getloadavg()

    def power_package(
        self,
        database: Database,
    ) -> Optional[float]:
        """CPU package power"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "cpu" in item.hardware_type.lower()
                and "power" in item.type.lower()
                and "package" in item.name.lower()
            ):
                self._logger.debug(
                    "Found CPU package power: %s = %s", item.key, item.value
                )
                return item.value
        return None

    def power_per_cpu(
        self,
        database: Database,
    ) -> Optional[list[tuple[int, float]]]:
        """CPU package power"""
        result: list[tuple[int, float]] = []
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "cpu" in item.hardware_type.lower()
                and "power" in item.type.lower()
                and "core" in item.name.lower()
            ):
                key: int = int(item.key.split("#")[1].split("_")[0])
                self._logger.debug(
                    "Found per CPU power: %s (%s) = %s", key, item.key, item.value
                )
                if key is not None:
                    result.append((key - 1, item.value))
        self._logger.debug("Per CPU power result: %s", result)
        if len(result) > 0:
            return result
        return None

    def stats(self) -> scpustats:
        """CPU stats"""
        return cpu_stats()

    def temperature(
        self,
        database: Database,
    ) -> Optional[float]:
        """CPU temperature"""
        for item in database.get_data(SensorsDatabaseModel):
            if item.hardware_type is not None and (
                (
                    "cpu" in item.hardware_type.lower()
                    and "temperature" in item.type.lower()
                )
                or (
                    "k10temp" in item.hardware_type.lower()
                    and "current" in item.type.lower()
                )
            ):
                self._logger.debug(
                    "Found CPU temperature: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def times(self) -> pcputimes:
        """CPU times"""
        return cpu_times(percpu=False)

    def times_percent(self) -> pcputimes:
        """CPU times percent"""
        return cpu_times_percent(interval=1, percpu=False)

    def times_per_cpu(
        self,
    ) -> list[pcputimes]:  # pylint: disable=unsubscriptable-object
        """CPU times per CPU"""
        return cpu_times(percpu=True)

    def times_per_cpu_percent(
        self,
    ) -> list[pcputimes]:  # pylint: disable=unsubscriptable-object
        """CPU times per CPU percent"""
        return cpu_times_percent(interval=1, percpu=True)

    def usage(self) -> float:
        """CPU usage"""
        return cpu_percent(interval=1, percpu=False)

    def usage_per_cpu(self) -> list[float]:  # pylint: disable=unsubscriptable-object
        """CPU usage per CPU"""
        return cpu_percent(interval=1, percpu=True)  # type: ignore

    def voltage(
        self,
        database: Database,
    ) -> Optional[float]:
        """CPU voltage"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "cpu" in item.hardware_type.lower()
                and "voltage" in item.type.lower()
            ):
                self._logger.debug("Found CPU voltage: %s = %s", item.key, item.value)
                return item.value
        return None
