from keyboard import press_and_release, write
from sanic.request import Request
from sanic.response import HTTPResponse, json


async def handler_keyboard(
    request: Request,
) -> HTTPResponse:
    if "key" in request.json:
        press_and_release(request.json["key"])
        return json(
            {
                "message": "Keypress sent",
                "key": request.json["key"],
            }
        )
    elif "text" in request.json:
        write(request.json["text"])
        return json(
            {
                "message": "Text sent",
                "text": request.json["text"],
            }
        )

    return json(
        {
            "message": "No key or text provided",
        },
        status=400,
    )
