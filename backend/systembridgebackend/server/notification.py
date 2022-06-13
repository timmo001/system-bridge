"""System Bridge: Server Handler - Notification"""
from __future__ import annotations

import os
import platform

from plyer import notification
from sanic.request import Request
from sanic.response import HTTPResponse, json


def send_notification(
    message: str,
    title: str | None = None,
    app_name: str | None = None,
    app_icon: str | None = None,
    timeout: int | None = 5,
) -> None:
    """Send a notification."""
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

    send_notification(
        message=request.json["message"],
        title=request.json.get("title"),
        app_name=request.json.get("app_name"),
        app_icon=request.json.get("app_icon"),
        timeout=request.json.get("timeout"),
    )

    return json(
        {
            "message": "Notification sent",
        }
    )
