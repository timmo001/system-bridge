import logging
import sys
from argparse import ArgumentParser, Namespace
from PySide6.QtCore import Qt, QUrl
from PySide6.QtGui import QAction, QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon, QVBoxLayout, QWidget
from typing import Callable
from urllib.parse import urlencode
from webbrowser import open_new_tab

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

PATH_DATA = "/app/data"
PATH_LOGS = "/app/logs"
PATH_SETTINGS = "/app/settings"

URL_DISCUSSIONS = "https://github.com/timmo001/system-bridge/discussions"
URL_DOCS = "https://system-bridge.timmo.dev"
URL_ISSUES = "https://github.com/timmo001/system-bridge/issues/new/choose"


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


class SystemTrayIcon(QSystemTrayIcon):
    """System Tray Icon"""

    def __init__(
        self,
        icon: QIcon,
        parent: QWidget,
        exit: Callable[[], None],
        show_window: Callable[[str], None],
    ):
        """Initialize the system tray icon"""
        QSystemTrayIcon.__init__(self, icon, parent)
        menu = QMenu()
        self.show_window = show_window

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self.showSettings)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self.showData)

        menu.addSeparator()

        menu_help = menu.addMenu("Help")

        action_docs = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self.openDocs)

        action_feature = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self.openFeatureRequest)

        action_issue = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self.openIssues)

        action_discussions = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self.openDiscussions)

        menu_help.addSeparator()

        action_logs = menu_help.addAction("View Logs")
        action_logs.triggered.connect(self.showLogs)

        menu.addSeparator()

        menu.addAction("Exit", exit)

        self.setContextMenu(menu)

    def showData(self):
        """Show api data"""
        self.show_window(PATH_DATA)

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

    def closeEvent(self, evnt: QCloseEvent):
        """Close the window instead of closing the app"""
        evnt.ignore()
        self.hide()

    def setup(self, path) -> None:
        self.browser.load(
            QUrl(
                f"""http://{self.args.hostname}:{self.args.port}{path}?{urlencode({
                    "apiKey": self.args.api_key,
                    "apiPort": self.args.port,
                    "wsPort": self.args.websocket_port,
                })}"""
            )
        )


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

        self.main_window = MainWindow(self.args, self.logger)
        self.main_window.setWindowTitle("System Bridge")
        self.main_window.setWindowIcon(self.icon)
        self.main_window.resize(1920, 1080)

        self.systemTrayIcon = SystemTrayIcon(
            self.icon,
            app,
            app.quit,
            self.showWindow,
        )
        self.systemTrayIcon.show()

    def showWindow(self, path: str):
        """Show the window"""
        self.logger.info(f"Showing window: {path}")
        self.main_window.setup(path)
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
