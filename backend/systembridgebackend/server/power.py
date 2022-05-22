"""System Bridge: Server Handler - Power"""
import os
import sys

from sanic.request import Request
from sanic.response import HTTPResponse, json


def sleep() -> None:
    """Send the system to sleep."""
    if sys.platform == "linux":
        os.system("systemctl suspend")
    elif sys.platform == "win32":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")


async def handler_sleep(
    _: Request,
) -> HTTPResponse:
    """Open a file or a URL in the default browser."""
    sleep()
    return json(
        {
            "message": "Sleeping",
        }
    )
