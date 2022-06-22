"""System Bridge: Server Handler - Keyboard"""
from keyboard import press_and_release, write
from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.settings import Settings


def keyboard_keypress(key: str):
    """Press a keyboard key"""
    press_and_release(key)


def keyboard_text(text: str):
    """Type text"""
    write(text)


async def handler_keyboard(
    request: Request,
    _: Settings,
) -> HTTPResponse:
    """Send a keyboard event."""
    if request.json is None:
        return json(
            {
                "mesage": "Missing JSON body",
            },
            status=400,
        )

    if "key" in request.json:
        try:
            keyboard_keypress(request.json["key"])
        except ValueError as err:
            return json(
                {
                    "message": err.args[0],
                },
                status=400,
            )

        return json(
            {
                "message": "Keypress sent",
                "key": request.json["key"],
            }
        )
    if "text" in request.json:
        keyboard_text(request.json["text"])
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
