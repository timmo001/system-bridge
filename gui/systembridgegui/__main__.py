"""System Bridge GUI: Main"""
import asyncio
import sys

from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication

from systembridgegui.system_tray import SystemTray
from systembridgegui.window.main import MainWindow
from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge GUI: Startup")

        self._database = database
        self._settings = settings
        self._websocket_client = WebSocketClient(self._settings)

        self._application = QApplication([])
        self._icon = QIcon("../resources/system-bridge-circle.png")
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

        self._main_window = MainWindow(self._icon)
        # self._main_window.resize(1280, 720)
        # self._main_window.showNormal()
        # self._main_window.hide()

        self._system_tray_icon = SystemTray(
            self._icon,
            self._application,
            self._callback_exit_application,
            self._callback_show_window,
        )
        self._system_tray_icon.show()

        sys.exit(self._application.exec())

    def _callback_exit_application(self) -> None:
        """Exit the application"""
        asyncio.run(self._exit_application())

    def _callback_show_window(
        self,
        path: str,
        maximized: bool,
        width: int = 1280,
        height: int = 720,
    ) -> None:
        """Show the main window"""
        self._logger.info("Showing window: %s", path)

        self._main_window.hide()
        self._main_window.setup(path)
        self._main_window.resize(width, height)
        screen_geometry = self._application.primaryScreen().availableSize()
        self._main_window.move(
            (screen_geometry.width() - self._main_window.width()) / 2,
            (screen_geometry.height() - self._main_window.height()) / 2,
        )
        if maximized:
            self._main_window.showMaximized()
        else:
            self._main_window.showNormal()

    async def _exit_application(self) -> None:
        """Exit the backend"""
        self._logger.info("Exit Backend..")
        # await self.bridge.async_connect_websocket(
        #     self.args.hostname,
        #     self.args.websocket_port,
        # )
        # await self.bridge.async_send_event("exit-application", {})
        self._logger.info("Exit GUI..")
        self._application.quit()


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())

    database = Database()
    settings = Settings(database)

    log_level = settings.get(SETTING_LOG_LEVEL)

    setup_logger(log_level, "system-bridge-gui")

    Main()
