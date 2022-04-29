"""System Bridge: Update Display"""
from systembridgeshared.common import make_key
from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.display import Display


class DisplayUpdate(ModuleUpdateBase):
    """Display Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "display")
        self._display = Display()

    async def update_name(
        self,
        display_key: str,
        display_name: str,
    ) -> None:
        """Update name"""
        self._database.write("display", f"{display_key}_name", display_name)

    async def update_pixel_clock(
        self,
        display_key: str,
    ) -> None:
        """Update pixel clock"""
        self._database.write(
            "display",
            f"{display_key}_pixel_clock",
            self._display.pixel_clock(self._database),
        )

    async def update_refresh_rate(
        self,
        display_key: str,
    ) -> None:
        """Update refresh rate"""
        self._database.write(
            "display",
            f"{display_key}_refresh_rate",
            self._display.refresh_rate(self._database),
        )

    async def update_resolution_horizontal(
        self,
        display_key: str,
    ) -> None:
        """Update resolution horizontal"""
        self._database.write(
            "display",
            f"{display_key}_resolution_horizontal",
            self._display.resolution_horizontal(self._database),
        )

    async def update_resolution_vertical(
        self,
        display_key: str,
    ) -> None:
        """Update resolution vertical"""
        self._database.write(
            "display",
            f"{display_key}_resolution_vertical",
            self._display.resolution_vertical(self._database),
        )

    async def update_all_data(self) -> None:
        """Update data"""
        for display_name in self._display.get_displays(self._database):
            display_key = make_key(display_name)
            await self.update_name(display_key, display_name)
            await self.update_pixel_clock(display_key)
            await self.update_refresh_rate(display_key)
            await self.update_resolution_horizontal(display_key)
            await self.update_resolution_vertical(display_key)
