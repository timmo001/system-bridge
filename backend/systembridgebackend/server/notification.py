"""System Bridge: Server Handler - Notification"""
from __future__ import annotations

from json import loads
import os
import platform

from plyer import notification
from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.models.notification import Notification as NotificationModel
from systembridgeshared.settings import Settings


def send_notification(data: NotificationModel) -> None:
    """Send a notification."""
    title = data.title
    message = data.message
    app_name = data.app_name
    app_icon = data.app_icon
    timeout = data.timeout

    if title is None:
        title = "System Bridge"
    if app_name is None:
        app_name = "System Bridge"
    if app_icon is None:
        app_icon = (
            os.path.join(os.path.dirname(__file__), "../icon.ico")
            if "Windows" in platform.system()
            else os.path.join(os.path.dirname(__file__), "../icon.png")
        )
    if timeout is None:
        timeout = 5

    notification.notify(
        title=title,
        message=message,
        app_name=app_name,
        app_icon=app_icon,
        timeout=timeout,
    )


async def handler_notification(
    request: Request,
    _: Settings,
) -> HTTPResponse:
    """Send a notification."""
    if request.json is None:
        return json(
            {
                "mesage": "Missing JSON body",
            },
            status=400,
        )

    if "message" not in request.json:
        return json(
            {
                "message": "No message provided",
            },
            status=400,
        )

    send_notification(NotificationModel(**loads(request.json)))

    return json(
        {
            "message": "Notification sent",
        }
    )
