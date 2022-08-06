"""System Bridge: Display"""
from __future__ import annotations

from typing import Optional

from systembridgeshared.base import Base
from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_sensors import (
    Sensors as SensorsDatabaseModel,
)


class Display(Base):
    """Display"""

    def get_displays(
        self,
        database: Database,
    ) -> list[str]:
        """Get Displays"""
        displays = []
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "display" in item.hardware_type.lower()
                and item.hardware_name is not None
                and item.hardware_name not in displays
            ):
                displays.append(item.hardware_name)
        return displays

    def pixel_clock(
        self,
        database: Database,
        display_key: str,
    ) -> Optional[float]:
        """Display pixel clock"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "display" in item.hardware_type.lower()
                and "pixel" in item.name.lower()
                and "clock" in item.name.lower()
                and make_key(item.hardware_name) == display_key
            ):
                self._logger.debug(
                    "Found display pixel clock: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def refresh_rate(
        self,
        database: Database,
        display_key: str,
    ) -> Optional[float]:
        """Display refresh rate"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "display" in item.hardware_type.lower()
                and "refresh" in item.name.lower()
                and "rate" in item.name.lower()
                and make_key(item.hardware_name) == display_key
            ):
                self._logger.debug(
                    "Found display refresh rate: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def resolution_horizontal(
        self,
        database: Database,
        display_key: str,
    ) -> Optional[int]:
        """Display resolution horizontal"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "display" in item.hardware_type.lower()
                and "resolution" in item.name.lower()
                and "horizontal" in item.name.lower()
                and make_key(item.hardware_name) == display_key
            ):
                self._logger.debug(
                    "Found display resolution horizontal: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None

    def resolution_vertical(
        self,
        database: Database,
        display_key: str,
    ) -> Optional[int]:
        """Display resolution vertical"""
        for item in database.get_data(SensorsDatabaseModel):
            if (
                item.hardware_type is not None
                and "display" in item.hardware_type.lower()
                and "resolution" in item.name.lower()
                and "vertical" in item.name.lower()
                and make_key(item.hardware_name) == display_key
            ):
                self._logger.debug(
                    "Found display resolution vertical: %s = %s",
                    item.key,
                    item.value,
                )
                return item.value
        return None
