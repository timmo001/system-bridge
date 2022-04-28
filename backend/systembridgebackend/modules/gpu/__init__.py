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
                return value
        return None

    def core_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU core load"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "core" in key and "load" in key:
                return value
        return None

    def memory_clock(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory clock"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "clock" in key:
                return value
        return None

    def memory_load(
        self,
        database: Database,
    ) -> float | None:
        """GPU memory load"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "memory" in key and "load" in key:
                return value
        return None

    def power(
        self,
        database: Database,
    ) -> float | None:
        """GPU power usage"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "power" in key:
                return value
        return None

    def temperature(
        self,
        database: Database,
    ) -> float | None:
        """GPU temperature"""
        for key, value in database.table_data_to_ordered_dict("sensors").items():
            if "gpu" in key and "temperature" in key:
                return value
        return None
