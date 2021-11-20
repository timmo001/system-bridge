"""System Bridge GUI: Main Window"""
from argparse import Namespace
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QCloseEvent
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QVBoxLayout, QWidget

from ..base import Base


class MainWindow(Base, QWidget):
    """Main Window"""

    def __init__(
        self,
        args: Namespace,
    ) -> None:
        """Initialize the main window"""
        Base.__init__(self, args)
        QWidget.__init__(self)

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
