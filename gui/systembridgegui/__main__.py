"""System Bridge GUI: Main"""
from __future__ import annotations

import asyncio
import json

from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from typer import Typer

from . import Application
from ._version import __version__

asyncio.set_event_loop(asyncio.new_event_loop())

app = Typer()
database = Database()
settings = Settings(database)

log_level: str = str(settings.get(SETTING_LOG_LEVEL))

setup_logger(log_level, "system-bridge-gui")


@app.command(name="main", help="Run the main application")
def main(
    gui_only: bool = False,
) -> None:
    """Run the main application"""
    Application(
        database,
        settings,
        command="main",
        gui_only=gui_only,
    )


@app.command(name="media-player", help="Run the media player")
def media_player(
    media_type: str,
    data: str,
) -> None:
    """Run the media player"""
    Application(
        database,
        settings,
        command=f"media-player-{media_type}",
        data=json.loads(data),
    )


@app.command(name="notification", help="Show a notification")
def notification(
    data: str,
) -> None:
    """Show a notification"""
    Application(
        database,
        settings,
        command="notification",
        data=json.loads(data),
    )


if __name__ == "__main__":
    app()
