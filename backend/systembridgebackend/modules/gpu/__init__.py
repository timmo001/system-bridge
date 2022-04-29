"""System Bridge: GPU"""
from __future__ import annotations

from systembridgeshared.database import Database

from systembridgeshared.base import Base


class GPU(Base):
    """GPU"""

    def core_clock(
        self,
        database: Database,
    ) -> float | None:
        """GPU core clock"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "core" in key and "clock" in key:
                self._logger.debug("Found GPU core clock: %s = %s", key, value)
                return value
        return None

    def core_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU core load"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "core" in key and "load" in key:
                self._logger.debug("Found GPU core load: %s = %s", key, value)
                return value
        return None

    def fan_speed(
        self,
        database: Database,
    ) -> float | None:
        """GPU fan speed"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "fan" in key:
                self._logger.debug("Found GPU fan speed: %s = %s", key, value)
                return value
        return None

    def memory_clock(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory clock"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "clock" in key:
                self._logger.debug("Found GPU memory clock: %s = %s", key, value)
                return value
        return None

    def memory_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory load"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "load" in key:
                self._logger.debug("Found GPU memory load: %s = %s", key, value)
                return value
        return None

    def memory_free(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory free"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "free" in key:
                self._logger.debug("Found GPU memory free: %s = %s", key, value)
                return value
        return None

    def memory_used(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory used"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "used" in key:
                self._logger.debug("Found GPU memory used: %s = %s", key, value)
                return value
        return None

    def memory_total(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory total"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "total" in key:
                self._logger.debug("Found GPU memory total: %s = %s", key, value)
                return value
        return None

    def power(
        self,
        database: Database,
    ) -> float | None:
        """GPU power usage"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "power" in key:
                self._logger.debug("Found GPU power: %s = %s", key, value)
                return value
        return None

    def temperature(
        self,
        database: Database,
    ) -> float | None:
        """GPU temperature"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "temperature" in key:
                self._logger.debug("Found GPU temperature: %s = %s", key, value)
                return value
        return None
