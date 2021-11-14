"""System Bridge GUI: Main class"""
from argparse import Namespace
import asyncio
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication
from aiohttp.client import ClientSession
from systembridge import Bridge, BridgeClient

from .base import Base
from .system_tray import SystemTray
from .window_main import MainWindow


class Main(Base):
    """Main class"""

    def __init__(
        self,
        args: Namespace,
        application: QApplication,
    ) -> None:
        """Initialize the main class"""
        super().__init__(args)

        self.application = application

        self.icon = QIcon("public/system-bridge-circle.png")
        asyncio.run(self.setup_bridge())

        self.main_window = MainWindow(self.args)
        self.main_window.setWindowTitle("System Bridge")
        self.main_window.setWindowIcon(self.icon)
        self.main_window.resize(1280, 720)

        self.system_tray_icon = SystemTray(
            self.args,
            self.icon,
            self.application,
            self.information,
            self.callback_exit_application,
            self.callback_show_window,
        )
        self.system_tray_icon.show()

    def callback_exit_application(self) -> None:
        """Exit the application"""
        self.logger.info("Exiting application..")
        asyncio.run(self.exit_backend())
        self.application.quit()

    def callback_show_window(
        self,
        path: str,
        maximized: bool = True,
    ) -> None:
        """Show the main window"""
        self.logger.info("Showing window: %s", path)
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
        async with ClientSession() as session:
            self.bridge = Bridge(
                BridgeClient(session),
                f"http://{self.args.hostname}:{self.args.port}",
                self.args.api_key,
            )
            self.information = await self.bridge.async_get_information()
