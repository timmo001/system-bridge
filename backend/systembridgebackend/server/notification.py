"""System Bridge: Server Handler - Notification"""
from __future__ import annotations

from collections.abc import Callable

from systembridgeshared.models.notification import Notification as NotificationModel
from systembridgeshared.settings import Settings


async def handler_notification(
    request,
    _: Settings,
    callback: Callable[[NotificationModel], None],
):
    """Send a notification."""
    if request.json is None:
        return json(
            {
                "mesage": "Missing JSON body",
            },
            status=400,
        )

    if "title" not in request.json:
        return json(
            {
                "message": "No title provided",
            },
            status=400,
        )

    try:
        notification = NotificationModel(**request.json)
    except ValueError as error:
        return json(
            {
                "message": str(error),
            },
            status=400,
        )
    if notification.timeout is None:
        notification.timeout = 5

    callback(notification)

    return json(
        {
            "message": "Notification sent",
        }
    )
