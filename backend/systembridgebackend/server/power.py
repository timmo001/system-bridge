"""System Bridge: Server Handler - Power"""
import asyncio
import os
import sys

from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.settings import Settings


def sleep() -> None:
    """Send the system to sleep."""
    if sys.platform == "linux":
        os.system("systemctl suspend")
    elif sys.platform == "win32":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")


def hibernate() -> None:
    """Hibernate the system."""
    if sys.platform == "linux":
        os.system("systemctl hibernate")
    elif sys.platform == "win32":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 1,1,0")


def restart() -> None:
    """Restart the system."""
    if sys.platform == "linux":
        os.system("systemctl restart")
    elif sys.platform == "win32":
        os.system("shutdown /r /t 0")


def shutdown() -> None:
    """Shutdown the system."""
    if sys.platform == "linux":
        os.system("systemctl poweroff")
    elif sys.platform == "win32":
        os.system("shutdown /s /t 0")


def lock() -> None:
    """Lock the system."""
    if sys.platform == "linux":
        os.system("xdg-screensaver lock")
    elif sys.platform == "win32":
        os.system("rundll32.exe user32.dll,LockWorkStation")


def logout() -> None:
    """Logout the user."""
    if sys.platform == "linux":
        os.system("pkexec --user $(whoami) gdm-force-logout")
    elif sys.platform == "win32":
        os.system("logoff")


async def handler_sleep(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle sleep requests."""
    asyncio.get_running_loop().call_later(2, sleep)
    return json(
        {
            "message": "Sleeping",
        }
    )


async def handler_hibernate(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle hibernate requests."""
    asyncio.get_running_loop().call_later(2, hibernate)
    return json(
        {
            "message": "Hibernating",
        }
    )


async def handler_restart(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle restart requests."""
    asyncio.get_running_loop().call_later(2, restart)
    return json(
        {
            "message": "Restarting",
        }
    )


async def handler_shutdown(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle shutdown requests."""
    asyncio.get_running_loop().call_later(2, shutdown)
    return json(
        {
            "message": "Shutting down",
        }
    )


async def handler_lock(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle lock requests."""
    asyncio.get_running_loop().call_later(2, lock)
    return json(
        {
            "message": "Locking",
        }
    )


async def handler_logout(
    _: Request,
    settings: Settings,
) -> HTTPResponse:
    """Handle logout requests."""
    asyncio.get_running_loop().call_later(2, logout)
    return json(
        {
            "message": "Logging out",
        }
    )
