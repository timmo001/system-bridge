"""System Bridge GUI: Main class"""
from argparse import Namespace
import asyncio
import os
import sys
import async_timeout
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication
from aiohttp.client import ClientSession
from systembridge import Bridge, BridgeClient
from aiohttp.client_exceptions import (
    ClientConnectionError,
    ClientConnectorError,
    ClientResponseError,
)
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

        with open(f"{os.path.dirname(__file__)}/style.qss", "r") as style_file:
            self.application.setStyleSheet(style_file.read())

        asyncio.run(self.setup_bridge())

        self.main_window = MainWindow(
            self.args,
            self.icon,
        )

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

        self.main_window.resize(width, height)
        self.main_window.setup(path)
        if maximized:
            self.main_window.showMaximized()
        else:
            self.main_window.show()

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
