import logging
import sys
from argparse import ArgumentParser, Namespace
from typing import Callable
from PySide6.QtCore import Qt, QUrl
from PySide6.QtGui import QAction, QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon, QVBoxLayout, QWidget
from urllib.parse import urlencode

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

PATH_DATA = "/app/data"
PATH_SETTINGS = "/app/settings"


class Base:
    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
    ):
        self.args = args
        self.logger = logger


class SystemTrayIcon(QSystemTrayIcon):
    def __init__(
        self,
        icon: QIcon,
        parent: QWidget,
        exit: Callable[[], None],
        show_window: Callable[[str], None],
    ):
        QSystemTrayIcon.__init__(self, icon, parent)
        menu = QMenu()
        self.show_window = show_window

        action_settings: QAction = menu.addAction("Settings")
        action_settings.triggered.connect(self.showSettings)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self.showData)

        menu.addSeparator()

        menu.addAction("Exit", exit)

        self.setContextMenu(menu)

    def showData(self):
        self.show_window(PATH_DATA)

    def showSettings(self):
        self.show_window(PATH_SETTINGS)


class MainWindow(Base, QWidget):
    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
    ) -> None:
        Base.__init__(self, args, logger)
        QWidget.__init__(self)
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

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

    def closeEvent(self, evnt: QCloseEvent):
        evnt.ignore()
        self.hide()


class Main(Base):
    def __init__(
        self,
        args: Namespace,
        logger: logging.Logger,
        app: QApplication,
    ) -> None:
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
        self.logger.info(f"Showing window: {path}")
        self.main_window.setup(path)
        self.main_window.show()


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("-ah", "--host", dest="hostname", help="API Hostname")
    parser.add_argument("-ak", "--api-key", dest="api_key", help="API key")
    parser.add_argument("-ap", "--api-port", dest="port", help="API Port")
    parser.add_argument("-ll", "--log-level", dest="log_level", help="Log level")
    parser.add_argument(
        "-wp", "--websocket-port", dest="websocket_port", help="WebSocket Port"
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
