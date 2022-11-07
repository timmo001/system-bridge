"""System Bridge: Update Display"""
import asyncio
from json import dumps
from typing import Optional

from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Display as DatabaseModel

from ..base import ModuleUpdateBase
from . import Display


class DisplayUpdate(ModuleUpdateBase):
    """Display Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._display = Display()

    async def update_name(
        self,
        display_key: str,
        display_name: str,
    ) -> None:
        """Update name"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_name",
                value=display_name,
            ),
        )

    async def update_pixel_clock(
        self,
        display_key: str,
        value: Optional[float] = None,
    ) -> None:
        """Update pixel clock"""
        if value is None:
            value = self._display.sensors_pixel_clock(self._database, display_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_pixel_clock",
                value=str(value) if value is not None else None,
            ),
        )

    async def update_refresh_rate(
        self,
        display_key: str,
        value: Optional[float] = None,
    ) -> None:
        """Update refresh rate"""
        if value is None:
            value = self._display.sensors_refresh_rate(self._database, display_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_refresh_rate",
                value=str(value) if value is not None else None,
            ),
        )

    async def update_resolution_horizontal(
        self,
        display_key: str,
        value: Optional[int] = None,
    ) -> None:
        """Update resolution horizontal"""
        if value is None:
            value = self._display.sensors_resolution_horizontal(
                self._database, display_key
            )
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_resolution_horizontal",
                value=str(value) if value is not None else None,
            ),
        )

    async def update_resolution_vertical(
        self,
        display_key: str,
        value: Optional[int] = None,
    ) -> None:
        """Update resolution vertical"""
        if value is None:
            value = self._display.sensors_resolution_vertical(
                self._database, display_key
            )
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_resolution_vertical",
                value=str(value) if value is not None else None,
            ),
        )

    async def update_all_data(self) -> None:
        """Update data"""
        display_list = []
        displays = self._display.sensors_get_displays(self._database)

        if displays is not None and len(displays) > 0:
            # Clear table in case of hardware changes since last run
            self._database.clear_table(DatabaseModel)
            for display_name in displays:
                display_key = make_key(display_name)
                display_list.append(display_key)
                await asyncio.gather(
                    *[
                        self.update_name(display_key, display_name),
                        self.update_pixel_clock(display_key),
                        self.update_refresh_rate(display_key),
                        self.update_resolution_horizontal(display_key),
                        self.update_resolution_vertical(display_key),
                    ]
                )

            if len(display_list) == 0:
                self._logger.debug("No displays found. Using alternative")
                for key, display in enumerate(self._display.get_displays()):
                    display_key = (
                        str(key) if display.name is None else make_key(display.name)
                    )
                    display_list.append(display_key)
                    await asyncio.gather(
                        *[
                            self.update_name(display_key, display.name),
                            self.update_pixel_clock(display_key, display.pixel_clock),
                            self.update_refresh_rate(display_key, display.refresh_rate),
                            self.update_resolution_horizontal(
                                display_key, display.resolution_horizontal
                            ),
                            self.update_resolution_vertical(
                                display_key, display.resolution_vertical
                            ),
                        ]
                    )

            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key="displays",
                    value=dumps(display_list),
                ),
            )
