import os
from plyer import notification
from sanic.request import Request
from sanic.response import HTTPResponse, json


async def handler_notification(
    request: Request,
) -> HTTPResponse:
    if "message" not in request.json:
        return json(
            {
                "message": "No message provided",
            },
            status=400,
        )

    notification.notify(
        title=request.json["title"] if "title" in request.json else "",
        message=request.json["message"],
        app_name=request.json["app_name"]
        if "app_name" in request.json
        else "System Bridge",
        app_icon=request.json["icon"]
        if "icon" in request.json
        else "./resources/system-bridge-circle.ico"
        if os.name == "nt"
        else "./resources/system-bridge-circle.png",
        timeout=request.json["timeout"] if "timeout" in request.json else 10,
    )

    return json(
        {
            "message": "Notification sent",
        }
    )
