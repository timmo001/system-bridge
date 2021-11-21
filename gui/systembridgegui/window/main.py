"""System Bridge GUI: Main window"""
from argparse import Namespace
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import (
    QFrame,
    QVBoxLayout,
    QWidget,
)

from ..base import Base


class MainWindow(Base, QFrame):
    """Main Window"""

    def __init__(
        self,
        args: Namespace,
        icon: QIcon,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self, args)
        QFrame.__init__(self)

        self.setWindowTitle("System Bridge")
        self.setWindowIcon(icon)

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

    # pylint: disable=invalid-name
    def closeEvent(self, event: QCloseEvent) -> None:
        """Close the window instead of closing the app"""
        event.ignore()
        self.hide()

    def setup(self, path) -> None:
        """Setup the window"""
        url = QUrl(
            f"""http://{self.args.hostname}:{self.args.frontend_port}{path}?{urlencode({
                    "apiKey": self.args.api_key,
                    "apiPort": self.args.port,
                    "wsPort": self.args.websocket_port,
                })}"""
        )
        self.logger.debug("Opening url: %s", url)
        self.browser.load(url)
