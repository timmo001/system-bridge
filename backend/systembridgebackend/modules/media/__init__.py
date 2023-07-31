"""System Bridge: Media"""
from __future__ import annotations

import asyncio
import platform
from collections.abc import Awaitable, Callable
from typing import Optional

import winsdk.windows.media.control as wmc
from systembridgeshared.base import Base
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Media as DatabaseModel
from systembridgeshared.models.media import Media as MediaInfo


class Media(Base):
    """Media"""

    def __init__(
        self, database: Database, changed_callback: Callable[[str], Awaitable[None]]
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._changed_callback = changed_callback

        self.sessions: Optional[
            wmc.GlobalSystemMediaTransportControlsSessionManager
        ] = None
        self.current_session: Optional[
            wmc.GlobalSystemMediaTransportControlsSession
        ] = None

    def _current_session_changed_handler(
        self,
        _sender,
        result,
    ) -> None:
        """Session changed handler"""
        self._logger.info("Session changed: %s", result)
        if self._changed_callback is not None:
            asyncio.run(self.update_media_info())

    def _media_properties_changed_handler(
        self,
        _sender,
        result,
    ) -> None:
        """Media properties changed handler"""
        self._logger.info("Media properties changed: %s", result)
        if self._changed_callback is not None:
            asyncio.run(self.update_media_info())

    async def _update_data(
        self,
        media_info: Optional[MediaInfo] = None,
    ) -> None:
        """Update data"""
        self._logger.info("Updating media data")
        if media_info is None:
            self._database.clear_table(DatabaseModel)
            await self._changed_callback("media")
            return

        for key, value in media_info.dict().items():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=key,
                    value=value,
                ),
            )

        await self._changed_callback("media")

    async def update_media_info(self) -> None:
        """Update media info from the current session."""
        if platform.system() != "Windows":
            return None

        self.sessions = (
            await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
        )
        self.sessions.add_current_session_changed(self._current_session_changed_handler)

        self.current_session = self.sessions.get_current_session()
        if self.current_session:
            self.current_session.add_media_properties_changed(
                self._media_properties_changed_handler
            )
            media_info = MediaInfo()
            if info := self.current_session.get_playback_info():
                media_info.status = info.playback_status.name
                media_info.playback_rate = info.playback_rate
                media_info.shuffle = info.is_shuffle_active
                if info.auto_repeat_mode:
                    media_info.repeat = info.auto_repeat_mode.name
                if info.playback_type:
                    media_info.type = info.playback_type.name
                if info.controls:
                    media_info.is_fast_forward_enabled = (
                        info.controls.is_fast_forward_enabled
                    )
                    media_info.is_next_enabled = info.controls.is_next_enabled
                    media_info.is_pause_enabled = info.controls.is_pause_enabled
                    media_info.is_play_enabled = info.controls.is_play_enabled
                    media_info.is_previous_enabled = info.controls.is_previous_enabled
                    media_info.is_rewind_enabled = info.controls.is_rewind_enabled
                    media_info.is_stop_enabled = info.controls.is_stop_enabled

            if timeline := self.current_session.get_timeline_properties():
                media_info.duration = timeline.end_time.total_seconds()
                media_info.position = timeline.position.total_seconds()

            if (
                properties := await self.current_session.try_get_media_properties_async()
            ):
                media_info.title = properties.title
                media_info.subtitle = properties.subtitle
                media_info.artist = properties.artist
                media_info.album_artist = properties.album_artist
                media_info.album_title = properties.album_title
                media_info.track_number = properties.track_number

            await self._update_data(media_info)
        else:
            await self._update_data()
