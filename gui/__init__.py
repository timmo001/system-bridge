"""System Bridge GUI"""
from argparse import ArgumentParser
import asyncio
from collections.abc import Callable
import logging
import sys
from urllib.parse import urlencode
from webbrowser import open_new_tab

from PySide6.QtCore import QUrl
from PySide6.QtGui import QAction, QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon, QVBoxLayout, QWidget
from aiohttp.client import ClientSession
from systembridge import Bridge, BridgeClient
from systembridge.objects.information import Information

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

PATH_DATA = "/app/data"
PATH_LOGS = "/app/logs"
PATH_SETTINGS = "/app/settings"

URL_DISCUSSIONS = "https://github.com/timmo001/system-bridge/discussions"
URL_DOCS = "https://system-bridge.timmo.dev"
URL_ISSUES = "https://github.com/timmo001/system-bridge/issues/new/choose"
URL_LATEST_RELEASE = "https://github.com/timmo001/system-bridge/releases/latest"


class SystemTrayIcon(QSystemTrayIcon):
    """System Tray Icon"""

    def __init__(
        self,
        icon: QIcon,
        parent: QWidget,
        information: Information,
        callback_exit_application: Callable[[], None],
        callback_show_window: Callable[[str], None],
    ) -> None:
        """Initialize the system tray icon"""
        QSystemTrayIcon.__init__(self, icon, parent)
        menu = QMenu()
        self.callback_show_window = callback_show_window

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self.show_settings)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self.show_data)

        menu.addSeparator()

        latest_version_text = "Latest Version"
        if (
            information is not None
            and information.attributes is not None
            and information.updates is not None
            and information.updates.attributes is not None
        ):
            if (
                information.updates.available is not None
                and information.updates.available
            ):
                latest_version_text = f"""Version {
                        information.updates.version.new
                    } avaliable! ({
                        information.updates.version.current
                    } -> {
                        information.updates.version.new
                    })"""
            elif information.updates.newer:
                latest_version_text = f"""Version Newer ({
                        information.updates.version.current
                    } > {
                        information.updates.version.new
                    })"""
            else:
                latest_version_text = f"""Latest Version ({
                        information.updates.version.current
                    })"""

        action_latest_release: QAction = menu.addAction(latest_version_text)
        action_latest_release.triggered.connect(self.open_latest_releases)

        menu_help = menu.addMenu("Help")

        action_docs: QAction = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self.open_docs)

        action_feature: QAction = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self.open_feature_request)

        action_issue: QAction = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self.open_issues)

        action_discussions: QAction = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self.open_discussions)

        menu_help.addSeparator()

        action_logs: QAction = menu_help.addAction("View Logs")
        action_logs.triggered.connect(self.show_logs)

        menu.addSeparator()

        action_exit: QAction = menu.addAction("Exit")
        action_exit.triggered.connect(callback_exit_application)

        self.setContextMenu(menu)

    @staticmethod
    def open_latest_releases() -> None:
        """Open latest release"""
        open_new_tab(URL_LATEST_RELEASE)

    @staticmethod
    def open_docs() -> None:
        """Open documentation"""
        open_new_tab(URL_DOCS)

    @staticmethod
    def open_feature_request() -> None:
        """Open feature request"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def open_issues() -> None:
        """Open issues"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def open_discussions() -> None:
        """Open discussions"""
        open_new_tab(URL_DISCUSSIONS)

    def show_data(self) -> None:
        """Show api data"""
        self.callback_show_window(PATH_DATA)

    def show_logs(self) -> None:
        """Show logs"""
        self.callback_show_window(PATH_LOGS)

    def show_settings(self) -> None:
        """Show settings"""
        self.callback_show_window(PATH_SETTINGS)


class MainWindow(QWidget):
    """Main Window"""

    def __init__(self) -> None:
        """Initialize the main window"""
        QWidget.__init__(self)

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

    # pylint: disable=invalid-name
    def closeEvent(self, event: QCloseEvent):
        """Close the window instead of closing the app"""
        event.ignore()
        self.hide()

    def setup(self, path) -> None:
        """Setup the main window"""
        url = QUrl(
            f"""http://{args.hostname}:{args.frontend_port}{path}?{urlencode({
                    "apiKey": args.api_key,
                    "apiPort": args.port,
                    "wsPort": args.websocket_port,
                })}"""
        )
        logger.debug("Opening url: %s", url)
        self.browser.load(url)


class Main:
    """Main class"""

    def __init__(self) -> None:
        """Initialize the main class"""
        self.icon = QIcon("public/system-bridge-circle.png")
        asyncio.run(self.setup_bridge())

        self.main_window = MainWindow()
        self.main_window.setWindowTitle("System Bridge")
        self.main_window.setWindowIcon(self.icon)
        self.main_window.resize(1280, 720)

        self.system_tray_icon = SystemTrayIcon(
            self.icon,
            application,
            self.information,
            self.callback_exit_application,
            self.callback_show_window,
        )
        self.system_tray_icon.show()

    def callback_exit_application(self) -> None:
        """Exit the application"""
        logger.info("Exiting application..")
        asyncio.run(self.exit_backend())
        application.quit()

    def callback_show_window(
        self,
        path: str,
        maximized: bool = True,
    ) -> None:
        """Show the main window"""
        logger.info("Showing window: %s", path)
        self.main_window.setup(path)
        if maximized:
            self.main_window.showMaximized()
        else:
            self.main_window.show()

    async def exit_backend(self) -> None:
        """Exit the backend"""
        await self.bridge.async_connect_websocket(
            args.hostname,
            args.websocket_port,
        )
        await self.bridge.async_send_event("exit-application", {})

    async def setup_bridge(self) -> None:
        """Setup the bridge"""
        async with ClientSession() as session:
            self.bridge = Bridge(
                BridgeClient(session),
                f"http://{args.hostname}:{args.port}",
                args.api_key,
            )
            self.information = await self.bridge.async_get_information()


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "-ah",
        "--host",
        dest="hostname",
        help="API Hostname",
        default="localhost",
    )
    parser.add_argument(
        "-ak",
        "--api-key",
        dest="api_key",
        help="API key",
    )
    parser.add_argument(
        "-ap",
        "--api-port",
        dest="port",
        help="API Port",
        default=9170,
    )
    parser.add_argument(
        "-fp",
        "--frontend-port",
        dest="frontend_port",
        help="Frontend Port",
        default=9170,
    )
    parser.add_argument(
        "-ll",
        "--log-level",
        dest="log_level",
        help="Log level",
        default="INFO",
    )
    parser.add_argument(
        "-wp",
        "--websocket-port",
        dest="websocket_port",
        help="WebSocket Port",
        default=9172,
    )

    args = parser.parse_args()

    application = QApplication([])

    logging.basicConfig(
        format=FORMAT,
        datefmt=DATE_FORMAT,
        level=args.log_level.upper(),
    )
    logger = logging.getLogger(__name__)

    Main()

    sys.exit(application.exec())
