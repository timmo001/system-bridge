"""System Bridge: Windows Media Utilities"""
import winsdk.windows.media.control as wmc


async def _get_current_session() -> wmc.GlobalSystemMediaTransportControlsSession:
    """Get current media session"""
    sessions = (
        await wmc.GlobalSystemMediaTransportControlsSessionManager.request_async()
    )
    if current_session := sessions.get_current_session():
        return current_session
    else:
        raise Exception("No current session")


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
