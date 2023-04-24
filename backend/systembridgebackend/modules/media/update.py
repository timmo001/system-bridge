"""System Bridge: Update Media"""
import asyncio

from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Media as DatabaseModel

from ..base import ModuleUpdateBase
from . import Media


class MediaUpdate(ModuleUpdateBase):
    """Media Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._media = Media()

    async def update_media_info(self) -> None:
        """Update media info"""
        if media_info := await self._media.get_media_info():
            for key, value in media_info.dict().items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=key,
                        value=value,
                    ),
                )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_media_info(),
            ]
        )
