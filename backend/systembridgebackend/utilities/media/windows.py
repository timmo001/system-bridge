"""System Bridge: Windows Media Utilities"""
from winsdk.windows.media import (  # pylint: disable=import-error
    MediaPlaybackAutoRepeatMode,
)
from winsdk.windows.media import control as wmc  # pylint: disable=import-error


class WindowsMediaException(Exception):
    """Windows Media Exception"""


async def _get_current_session() -> wmc.GlobalSystemMediaTransportControlsSession:
    """Get current media session"""
    sessions = (
        await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
    )
    if current_session := sessions.get_current_session():
        return current_session
    raise WindowsMediaException("No current session")


async def windows_control_play():
    """Play current media"""
    session = await _get_current_session()
    await session.try_play_async()


async def windows_control_pause() -> None:
    """Pause current media"""
    session = await _get_current_session()
    await session.try_pause_async()


async def windows_control_stop() -> None:
    """Stop current media"""
    session = await _get_current_session()
    await session.try_stop_async()


async def windows_control_previous() -> None:
    """Previous current media"""
    session = await _get_current_session()
    await session.try_skip_previous_async()


async def windows_control_next() -> None:
    """Next current media"""
    session = await _get_current_session()
    await session.try_skip_next_async()


async def windows_control_seek(
    position: int,
) -> None:
    """Seek current media"""
    session = await _get_current_session()
    await session.try_change_playback_position_async(position)


async def windows_control_rewind() -> None:
    """Rewind current media"""
    session = await _get_current_session()
    await session.try_rewind_async()


async def windows_control_fastforward() -> None:
    """Fast forward current media"""
    session = await _get_current_session()
    await session.try_fast_forward_async()


async def windows_control_shuffle(
    shuffle: bool,
) -> None:
    """Shuffle current media"""
    session = await _get_current_session()
    await session.try_change_shuffle_active_async(shuffle)


async def windows_control_repeat(
    repeat: MediaPlaybackAutoRepeatMode,
) -> None:
    """Repeat current media"""
    session = await _get_current_session()
    await session.try_change_auto_repeat_mode_async(repeat)
