import asyncio
import logging
import sys
from aiohttp.client import ClientSession
from argparse import ArgumentParser, Namespace
from PySide6.QtCore import QUrl
from PySide6.QtGui import QAction, QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon, QVBoxLayout, QWidget
from systembridge import Bridge, BridgeClient
from typing import Callable
from urllib.parse import urlencode
from webbrowser import open_new_tab

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


class Base:
    """Base class"""

    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
    ):
        """Initialize the base class"""
        self.args = args
        self.logger = logger


class SystemTrayIcon(Base, QSystemTrayIcon):
    """System Tray Icon"""

    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
        icon: QIcon,
        parent: QWidget,
        information: Information,
        exit: Callable[[], None],
        show_window: Callable[[str], None],
    ):
        """Initialize the system tray icon"""
        Base.__init__(self, args, logger)
        QSystemTrayIcon.__init__(self, icon, parent)
        menu = QMenu()
        self.show_window = show_window

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self.showSettings)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self.showData)

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
                and information.updates.available == True
            ):
                latest_version_text = f"""Version {
                        information.updates.version.new
                    } avaliable! ({
                        information.updates.version.current
                    } -> {
                        information.updates.version.new
                    })"""
            elif information.updates.newer == True:
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
        action_latest_release.triggered.connect(self.openLatestReleases)

        menu_help = menu.addMenu("Help")

        action_docs: QAction = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self.openDocs)

        action_feature: QAction = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self.openFeatureRequest)

        action_issue: QAction = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self.openIssues)

        action_discussions: QAction = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self.openDiscussions)

        menu_help.addSeparator()

        action_logs: QAction = menu_help.addAction("View Logs")
        action_logs.triggered.connect(self.showLogs)

        menu.addSeparator()

        action_exit: QAction = menu.addAction("Exit")
        action_exit.triggered.connect(exit)

        self.setContextMenu(menu)

    def showData(self):
        """Show api data"""
        self.show_window(PATH_DATA)

    def openLatestReleases(self):
        """Open latest release"""
        open_new_tab(URL_LATEST_RELEASE)

    def showLogs(self):
        """Show logs"""
        self.show_window(PATH_LOGS)

    def showSettings(self):
        """Show settings"""
        self.show_window(PATH_SETTINGS)

    def openDocs(self):
        """Open documentation"""
        open_new_tab(URL_DOCS)

    def openFeatureRequest(self):
        """Open feature request"""
        open_new_tab(URL_ISSUES)

    def openIssues(self):
        """Open issues"""
        open_new_tab(URL_ISSUES)

    def openDiscussions(self):
        """Open discussions"""
        open_new_tab(URL_DISCUSSIONS)


class MainWindow(Base, QWidget):
    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
    ) -> None:
        """Initialize the main window"""
        Base.__init__(self, args, logger)
        QWidget.__init__(self)
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

    def closeEvent(self, event: QCloseEvent):
        """Close the window instead of closing the app"""
        event.ignore()
        self.hide()

    def setup(self, path) -> None:
        """Setup the main window"""
        url = QUrl(
            f"""http://{self.args.hostname}:{self.args.frontend_port}{path}?{urlencode({
                    "apiKey": self.args.api_key,
                    "apiPort": self.args.port,
                    "wsPort": self.args.websocket_port,
                })}"""
        )
        self.logger.debug(f"Opening url: {url}")
        self.browser.load(url)


class Main(Base):
    """Main class"""

    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
        app: QApplication,
    ) -> None:
        """Initialize the main class"""
        super().__init__(args, logger)
        self.app = app
        self.icon = QIcon("public/system-bridge-circle.png")
        asyncio.run(self.setupBridge())

        self.main_window = MainWindow(self.args, self.logger)
        self.main_window.setWindowTitle("System Bridge")
        self.main_window.setWindowIcon(self.icon)
        self.main_window.resize(1280, 720)

        self.systemTrayIcon = SystemTrayIcon(
            self.args,
            self.logger,
            self.icon,
            self.app,
            self.information,
            self.exitApplication,
            self.showWindow,
        )
        self.systemTrayIcon.show()

    def exitApplication(self) -> None:
        """Exit the application"""
        self.logger.info("Exiting application..")
        asyncio.run(self.exitBackend())
        self.app.quit()

    async def exitBackend(self) -> None:
        """Exit the backend"""
        await self.bridge.async_connect_websocket(
            self.args.hostname,
            self.args.websocket_port,
        )
        await self.bridge.async_send_event("exit-application", {})

    async def setupBridge(self) -> None:
        """Setup the bridge"""
        async with ClientSession() as session:
            self.bridge = Bridge(
                BridgeClient(session),
                f"http://{self.args.hostname}:{self.args.port}",
                self.args.api_key,
            )
            self.information = await self.bridge.async_get_information()

    def showWindow(self, path: str, maximized: bool = True) -> None:
        """Show the main window"""
        self.logger.info(f"Showing window: {path}")
        self.main_window.setup(path)
        if maximized == True:
            self.main_window.showMaximized()
        else:
            self.main_window.show()


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

    app = QApplication([])

    logging.basicConfig(
        format=FORMAT,
        datefmt=DATE_FORMAT,
        level=args.log_level.upper(),
    )
    logger = logging.getLogger(__name__)

    main = Main(args, logger, app)

    sys.exit(app.exec())
