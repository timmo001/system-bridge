"""System Bridge: Media"""
from __future__ import annotations

import asyncio
import datetime
import platform
from collections.abc import Awaitable, Callable
from typing import Optional

import winsdk.windows.media.control as wmc  # pylint: disable=import-error
from systembridgeshared.base import Base
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Media as DatabaseModel
from systembridgeshared.models.media import Media as MediaInfo
from winsdk.windows.foundation import (  # pylint: disable=import-error
    EventRegistrationToken,
)


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
        self.current_session_changed_handler_token: Optional[
            EventRegistrationToken
        ] = None
        self.properties_changed_handler_token: Optional[EventRegistrationToken] = None
        self.playback_info_changed_handler_token: Optional[
            EventRegistrationToken
        ] = None

    def _current_session_changed_handler(
        self,
        _sender,
        _result,
    ) -> None:
        """Session changed handler"""
        self._logger.info("Session changed")
        if self._changed_callback is not None:
            asyncio.run(self.update_media_info())

    def _properties_changed_handler(
        self,
        _sender,
        _result,
    ) -> None:
        """Properties changed handler"""
        self._logger.info("Media properties changed")
        if self._changed_callback is not None:
            asyncio.run(self.update_media_info())

    def _playback_info_changed_handler(
        self,
        _sender,
        _result,
    ) -> None:
        """Playback info changed handler"""
        self._logger.info("Media properties changed")
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

        if (
            self.sessions is not None
            and self.current_session_changed_handler_token is not None
        ):
            self.sessions.remove_current_session_changed(
                self.current_session_changed_handler_token
            )

        self.sessions = (
            await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
        )
        self.current_session_changed_handler_token = (
            self.sessions.add_current_session_changed(
                self._current_session_changed_handler
            )
        )

        if self.current_session is not None:
            if self.properties_changed_handler_token is not None:
                self.current_session.remove_media_properties_changed(
                    self.properties_changed_handler_token
                )
            if self.playback_info_changed_handler_token is not None:
                self.current_session.remove_playback_info_changed(
                    self.playback_info_changed_handler_token
                )

        self.current_session = self.sessions.get_current_session()
        if self.current_session:
            self.properties_changed_handler_token = (
                self.current_session.add_media_properties_changed(
                    self._properties_changed_handler
                )
            )
            self.playback_info_changed_handler_token = (
                self.current_session.add_playback_info_changed(
                    self._playback_info_changed_handler
                )
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

            media_info.updated_at = datetime.datetime.now().timestamp()

            await self._update_data(media_info)

            if media_info.status == "PLAYING":
                self._logger.info("Schedule media update in 5 seconds..")
                await asyncio.sleep(5)
                await self.update_media_info()
        else:
            await self._update_data(
                MediaInfo(updated_at=datetime.datetime.now().timestamp())
            )
