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

        import winsdk.windows.media.control as wmc  # pylint: disable=import-error,import-outside-toplevel

        sessions = (
            await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
        )
        if current_session := sessions.get_current_session():
            media_info = MediaInfo()
            if info := current_session.get_playback_info():
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

            if timeline := current_session.get_timeline_properties():
                media_info.duration = timeline.end_time.total_seconds()
                media_info.position = timeline.position.total_seconds()

            if properties := await current_session.try_get_media_properties_async():
                media_info.title = properties.title
                media_info.subtitle = properties.subtitle
                media_info.artist = properties.artist
                media_info.album_artist = properties.album_artist
                media_info.album_title = properties.album_title
                media_info.track_number = properties.track_number
            return media_info
        return None
