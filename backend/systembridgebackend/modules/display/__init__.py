"""System Bridge: Display"""
from __future__ import annotations

from systembridgeshared.base import Base
from systembridgeshared.const import (
    COLUMN_HARDWARE_NAME,
    COLUMN_HARDWARE_TYPE,
    COLUMN_KEY,
    COLUMN_NAME,
    COLUMN_VALUE,
)
from systembridgeshared.database import Database


class Display(Base):
    """Display"""

    def get_displays(
        self,
        database: Database,
    ) -> list[str]:
        """Get Displays"""
        displays = []
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "display" in item[COLUMN_HARDWARE_TYPE].lower()
                and item[COLUMN_HARDWARE_NAME] not in displays
            ):
                displays.append(item[COLUMN_HARDWARE_NAME])
        return displays

    def pixel_clock(
        self,
        database: Database,
    ) -> float | None:
        """Display pixel clock"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "display" in item[COLUMN_HARDWARE_TYPE].lower()
                and "pixel" in item[COLUMN_NAME].lower()
                and "clock" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found display pixel clock: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def refresh_rate(
        self,
        database: Database,
    ) -> float | None:
        """Display refresh rate"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "display" in item[COLUMN_HARDWARE_TYPE].lower()
                and "refresh" in item[COLUMN_NAME].lower()
                and "rate" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found display refresh rate: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def resolution_horizontal(
        self,
        database: Database,
    ) -> int | None:
        """Display resolution horizontal"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "display" in item[COLUMN_HARDWARE_TYPE].lower()
                and "resolution" in item[COLUMN_NAME].lower()
                and "horizontal" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found display resolution horizontal: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None

    def resolution_vertical(
        self,
        database: Database,
    ) -> int | None:
        """Display resolution vertical"""
        for item in database.read_table("sensors").to_dict(orient="records"):
            if (
                item[COLUMN_HARDWARE_TYPE] is not None
                and "display" in item[COLUMN_HARDWARE_TYPE].lower()
                and "resolution" in item[COLUMN_NAME].lower()
                and "vertical" in item[COLUMN_NAME].lower()
            ):
                self._logger.debug(
                    "Found display resolution vertical: %s = %s",
                    item[COLUMN_KEY],
                    item[COLUMN_VALUE],
                )
                return item[COLUMN_VALUE]
        return None
