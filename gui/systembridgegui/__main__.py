"""System Bridge GUI: Main"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Optional

from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication, QMessageBox
import async_timeout
from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.exceptions import (
    AuthenticationException,
    ConnectionErrorException,
)
from systembridgeshared.logger import setup_logger
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.models.notification import Notification
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient
from typer import Typer

from ._version import __version__
from .system_tray import SystemTray
from .widgets.timed_message_box import TimedMessageBox
from .window.main import MainWindow
from .window.notification import NotificationWindow
from .window.player import PlayerWindow


class Main(Base):
    """Main"""

    def __init__(
        self,
        command: str = "main",
        gui_only: bool = False,
        data: Optional[dict] = None,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge GUI %s: Startup", __version__.public())

        self._database = database
        self._settings = settings

        self._application = QApplication([])
        self._icon = QIcon(os.path.join(os.path.dirname(__file__), "icon.png"))
        self._application.setStyleSheet(
            """
            QWidget {
                color: #FFFFFF;
                background-color: #212121;
            }

            QMenu {
                background-color: #292929;
            }

            QMenu::item {
                background-color: transparent;
            }

            QMenu::item:selected {
                background-color: #757575;
            }
            """
        )

        if command == "main":
            self._logger.info("Main: Setup")

            self._gui_only = gui_only
            self._websocket_client = WebSocketClient(self._settings)

            asyncio.run(self._setup_websocket())
            asyncio.run(self._websocket_client.close())

            self._main_window = MainWindow(
                self._settings,
                self._icon,
            )

            self._system_tray_icon = SystemTray(
                self._database,
                self._settings,
                self._icon,
                self._application,
                self._callback_exit_application,
                self._callback_show_window,
            )
            self._system_tray_icon.show()
        elif command == "media-player-audio":
            self._logger.info("Media Player: Audio")
            if data is None:
                self._logger.error("No data provided!")
                self._startup_error("No data provided!")
                sys.exit(1)
            media_play = MediaPlay(**data)
            self._player_window = PlayerWindow(
                self._settings,
                self._icon,
                self._application,
                "audio",
                media_play,
            )
        elif command == "media-player-video":
            self._logger.info("Media Player: Video")
            if data is None:
                self._logger.error("No data provided!")
                self._startup_error("No data provided!")
                sys.exit(1)
            media_play = MediaPlay(**data)
            self._player_window = PlayerWindow(
                self._settings,
                self._icon,
                self._application,
                "video",
                media_play,
            )
        elif command == "notification":
            self._logger.info("Notification")
            if data is None:
                self._logger.error("No data provided!")
                self._startup_error("No data provided!")
                sys.exit(1)
            self._player_window = NotificationWindow(
                self._settings,
                self._icon,
                self._application,
                Notification(**data),
            )

        sys.exit(self._application.exec())

    def _callback_exit_application(self) -> None:
        """Exit the application"""
        asyncio.run(self._exit_application(self._gui_only))

    def _callback_show_window(
        self,
        path: str,
        maximized: bool,
        width: Optional[int] = 1280,
        height: Optional[int] = 720,
    ) -> None:
        """Show the main window"""
        self._logger.info("Showing window: %s", path)

        if width is None:
            width = 1280
        if height is None:
            height = 720

        self._main_window.hide()
        self._main_window.setup(path)
        self._main_window.resize(width, height)
        screen_geometry = self._application.primaryScreen().availableSize()
        self._main_window.move(
            int((screen_geometry.width() - self._main_window.width()) / 2),
            int((screen_geometry.height() - self._main_window.height()) / 2),
        )
        if maximized:
            self._main_window.showMaximized()
        else:
            self._main_window.showNormal()

    def _startup_error(
        self,
        message: str,
    ) -> None:
        """Handle a startup error"""
        error_message = TimedMessageBox(
            10,
            f"{message} Exiting in",
        )
        error_message.setIcon(QMessageBox.Critical)
        error_message.setWindowTitle("Error")
        error_message.exec()
        # Exit cleanly
        self._logger.info("Exit GUI..")
        self._application.quit()
        sys.exit(1)

    async def _exit_application(
        self,
        gui_only: bool,
    ) -> None:
        """Exit the backend"""
        if not gui_only:
            self._logger.info("Exit Backend..")
            await self._setup_websocket()
            await self._websocket_client.exit_backend()
            await self._websocket_client.close()
        self._logger.info("Exit GUI..")
        self._application.quit()

    async def _setup_websocket(self) -> None:
        """Setup the WebSocket client"""
        try:
            async with async_timeout.timeout(20):
                await self._websocket_client.connect()
        except AuthenticationException as exception:
            self._logger.error("Authentication failed: %s", exception)
            self._startup_error("Authentication failed!")
        except ConnectionErrorException as exception:
            self._logger.error("Could not connect to WebSocket: %s", exception)
            self._startup_error("Could not connect to WebSocket!")
        except asyncio.TimeoutError as exception:
            self._logger.error("Connection timeout to WebSocket: %s", exception)
            self._startup_error("Connection timeout to WebSocket!")


app = Typer()


@app.command(name="main", help="Run the main application")
def main(
    gui_only: bool = False,
) -> None:
    """Run the main application"""
    Main(command="main", gui_only=gui_only)


@app.command(name="media-player", help="Run the media player")
def media_player(
    media_type: str,
    data: str,
) -> None:
    """Run the media player"""
    Main(command=f"media-player-{media_type}", data=json.loads(data))


@app.command(name="notification", help="Show a notification")
def notification(
    data: str,
) -> None:
    """Show a notification"""
    Main(command="notification", data=json.loads(data))


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())
    database = Database()
    settings = Settings(database)

    log_level: str = str(settings.get(SETTING_LOG_LEVEL))

    setup_logger(log_level, "system-bridge-gui")

    app()
