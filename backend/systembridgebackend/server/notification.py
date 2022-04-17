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
        app_icon="./resources/system-bridge-circle.ico",
        timeout=10,
    )

    return json(
        {
            "message": "Notification sent",
        }
    )
