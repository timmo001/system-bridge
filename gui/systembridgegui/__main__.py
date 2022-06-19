"""System Bridge GUI: Main"""
from __future__ import annotations

import asyncio
import os
import sys

from PySide6.QtCore import QThreadPool
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication
from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient

from systembridgegui._version import __version__
from systembridgegui.system_tray import SystemTray
from systembridgegui.window.main import MainWindow
from systembridgegui.worker import Worker


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge GUI %s: Startup", __version__.public())

        self._database = database
        self._settings = settings
        self._websocket_client = WebSocketClient(self._settings)

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

        worker = Worker(
            self._application,
            self._websocket_client,
        )

        self._thread_pool = QThreadPool()
        self._thread_pool.start(worker)

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

        sys.exit(self._application.exec())

    def _callback_exit_application(
        self,
        gui_only: bool,
    ) -> None:
        """Exit the application"""
        asyncio.run(self._exit_application(gui_only))

    def _callback_show_window(
        self,
        path: str,
        maximized: bool,
        width: int | None = 1280,
        height: int | None = 720,
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

    async def _exit_application(
        self,
        gui_only: bool,
    ) -> None:
        """Exit the backend"""
        if not gui_only:
            self._logger.info("Exit Backend..")
            if not self._websocket_client.connected:
                await self._websocket_client.connect()
            await self._websocket_client.exit_backend()
            await self._websocket_client.close()
        self._logger.info("Exit GUI..")
        self._application.quit()


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())

    database = Database()
    settings = Settings(database)

    log_level: str = str(settings.get(SETTING_LOG_LEVEL))

    setup_logger(log_level, "system-bridge-gui")

    Main()
