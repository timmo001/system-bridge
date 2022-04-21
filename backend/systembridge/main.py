"""System Bridge GUI: Main class"""
from argparse import Namespace
import asyncio
import sys

from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication
from aiohttp.client import ClientSession
from aiohttp.client_exceptions import (
    ClientConnectionError,
    ClientConnectorError,
    ClientResponseError,
)
import async_timeout
from systembridge import Bridge, BridgeClient
from systembridge.exceptions import BridgeException

from .base import Base
from .system_tray import SystemTray
from .window.main import MainWindow


class Main(Base):
    """Main class"""

    def __init__(
        self,
        args: Namespace,
    ) -> None:
        """Initialize the main class"""
        super().__init__(args)

        self.application = QApplication([])
        self.icon = QIcon("public/system-bridge-circle.png")
        self.application.setStyleSheet(
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

        asyncio.run(self.setup_bridge())

        self.main_window = MainWindow(
            self.args,
            self.icon,
        )
        self.main_window.resize(1280, 720)
        self.main_window.showNormal()
        self.main_window.hide()

        self.system_tray_icon = SystemTray(
            self.args,
            self.icon,
            self.application,
            self.information,
            self.callback_exit_application,
            self.callback_show_window,
        )
        self.system_tray_icon.show()

        sys.exit(self.application.exec())

    def callback_exit_application(self) -> None:
        """Exit the application"""
        self.logger.info("Exiting application..")
        asyncio.run(self.exit_backend())
        self.application.quit()

    def callback_show_window(
        self,
        path: str,
        maximized: bool,
        width: int = 1280,
        height: int = 720,
    ) -> None:
        """Show the main window"""
        self.logger.info("Showing window: %s", path)

        self.main_window.hide()
        self.main_window.setup(path)
        self.main_window.resize(width, height)
        screen_geometry = self.application.primaryScreen().availableSize()
        self.main_window.move(
            (screen_geometry.width() - self.main_window.width()) / 2,
            (screen_geometry.height() - self.main_window.height()) / 2,
        )
        if maximized:
            self.main_window.showMaximized()
        else:
            self.main_window.showNormal()

    async def exit_backend(self) -> None:
        """Exit the backend"""
        await self.bridge.async_connect_websocket(
            self.args.hostname,
            self.args.websocket_port,
        )
        await self.bridge.async_send_event("exit-application", {})

    async def setup_bridge(self) -> None:
        """Setup the bridge"""
        try:
            async with async_timeout.timeout(30):
                async with ClientSession() as session:
                    self.bridge = Bridge(
                        BridgeClient(session),
                        f"http://{self.args.hostname}:{self.args.port}",
                        self.args.api_key,
                    )
                    self.information = await self.bridge.async_get_information()
        except (
            asyncio.TimeoutError,
            BridgeException,
            ClientConnectionError,
            ClientConnectorError,
            ClientResponseError,
            OSError,
        ) as exception:
            self.logger.error(exception)
            self.logger.info("Retrying in 5 seconds..")
            await asyncio.sleep(5)
            await self.setup_bridge()
