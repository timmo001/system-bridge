"""System Bridge: Server Handler - Notification"""
from __future__ import annotations

import os

from plyer import notification
from sanic.request import Request
from sanic.response import HTTPResponse, json


def send_notification(
    message: str,
    title: str | None = None,
    app_name: str = "System Bridge",
    app_icon: str | None = None,
    timeout: int = 5,
) -> None:
    """Send a notification."""
    notification.notify(
        title=title,
        message=message,
        app_name=app_name,
        app_icon=app_icon
        if app_icon is not None
        else "./resources/system-bridge-circle.ico"
        if os.name == "nt"
        else "./resources/system-bridge-circle.png",
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
