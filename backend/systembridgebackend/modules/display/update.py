"""System Bridge: Update Display"""
import asyncio
from json import dumps

from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Display as DatabaseModel

from . import Display
from ..base import ModuleUpdateBase


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
    ) -> None:
        """Update pixel clock"""
        value = self._display.pixel_clock(self._database, display_key)
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
    ) -> None:
        """Update refresh rate"""
        value = self._display.refresh_rate(self._database, display_key)
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
    ) -> None:
        """Update resolution horizontal"""
        value = self._display.resolution_horizontal(self._database, display_key)
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
    ) -> None:
        """Update resolution vertical"""
        value = self._display.resolution_vertical(self._database, display_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{display_key}_resolution_vertical",
                value=str(value) if value is not None else None,
            ),
        )

    async def update_all_data(self) -> None:
        """Update data"""

        # Clear table in case of hardware changes since last run
        self._database.clear_table(DatabaseModel)

        display_list = []
        for display_name in self._display.get_displays(self._database):
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
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="displays",
                value=dumps(display_list),
            ),
        )
