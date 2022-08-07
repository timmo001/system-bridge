"""System Bridge: Server Handler - Notification"""
from __future__ import annotations

import logging

from systembridgeshared.models.notification import Notification as NotificationModel
from systembridgeshared.settings import Settings

from ..gui import start_gui_threaded


async def handler_notification(
    settings: Settings,
    data: NotificationModel,
) -> dict:
    """Send a notification."""
    if data.timeout is None:
        data.timeout = 5

    start_gui_threaded(
        logging.getLogger(__name__),
        settings,
        "notification",
        data.json(),
    )

    return {
        "message": "Notification sent",
    }
