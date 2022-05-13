"""System Bridge: CPU"""
from __future__ import annotations

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
from systembridgeshared.const import (
    COLUMN_HARDWARE_TYPE,
    COLUMN_KEY,
    COLUMN_TYPE,
    COLUMN_VALUE,
)
from systembridgeshared.database import Database


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

    def stats(self) -> scpustats:
        """CPU stats"""
        return cpu_stats()

    def temperature(
        self,
        database: Database,
    ) -> float | None:
        """CPU temperature"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if item[COLUMN_HARDWARE_TYPE] is not None and (
                (
                    "cpu" in item[COLUMN_HARDWARE_TYPE].lower()
                    and "temperature" in item[COLUMN_TYPE].lower()
                )
                or (
                    "k10temp" in item[COLUMN_HARDWARE_TYPE].lower()
                    and "current" in item[COLUMN_TYPE].lower()
                )
            ):
                self._logger.debug(
                    "Found CPU temperature: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
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
    ) -> float | None:
        """CPU voltage"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "cpu" in item[COLUMN_HARDWARE_TYPE].lower()
                and "voltage" in item[COLUMN_TYPE].lower()
            ):
                self._logger.debug(
                    "Found CPU voltage: %s = %s", item[COLUMN_KEY], item[COLUMN_VALUE]
                )
                return item[COLUMN_VALUE]
        return None
