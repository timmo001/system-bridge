"""System Bridge: Media"""
from __future__ import annotations

import platform
from typing import Optional

from systembridgeshared.base import Base
from systembridgeshared.models.media import Media as MediaInfo


class Media(Base):
    """Media"""

    async def get_media_info(
        self,
    ) -> Optional[MediaInfo]:
        """Get media info from the current session."""
        if platform.system() != "Windows":
            return None

        import winsdk.windows.media.control as wmc

        sessions = (
            await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
        )
        current_session = sessions.get_current_session()
        if current_session:
            if properties := await current_session.try_get_media_properties_async():
                return MediaInfo(
                    title=properties.title,
                    subtitle=properties.subtitle,
                    artist=properties.artist,
                    album_artist=properties.album_artist,
                    album_title=properties.album_title,
                    track_number=properties.track_number,
                    # thumbnail=thumbnail,
                )
        return None
