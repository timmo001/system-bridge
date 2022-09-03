"""System Bridge: Display"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field  # pylint: disable=no-name-in-module
from screeninfo import get_monitors
from systembridgeshared.base import Base
from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_sensors import (
    Sensors as SensorsDatabaseModel,
)


class DisplayModel(BaseModel):
    """Display Model"""

    name: str = Field(..., description="Display name")
    pixel_clock: Optional[float] = Field(None, description="Pixel clock")
    refresh_rate: Optional[float] = Field(None, description="Refresh rate")
    resolution_horizontal: int = Field(..., description="Resolution horizontal")
    resolution_vertical: int = Field(..., description="Resolution vertical")


class Display(Base):
    """Display"""

    def get_displays(self) -> list[DisplayModel]:
        """Get Displays"""
        return [
            DisplayModel(
                name=monitor.name if monitor.name is not None else str(key),
                pixel_clock=None,
                refresh_rate=None,
                resolution_horizontal=monitor.width,
                resolution_vertical=monitor.height,
            )
            for key, monitor in enumerate(get_monitors())
        ]

    def sensors_get_displays(
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

    def sensors_pixel_clock(
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

    def sensors_refresh_rate(
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

    def sensors_resolution_horizontal(
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

    def sensors_resolution_vertical(
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
