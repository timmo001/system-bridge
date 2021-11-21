"""System Bridge GUI: Player Window"""
from argparse import Namespace
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon, Qt
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QVBoxLayout, QWidget

from ..base import Base


class PlayerWindow(Base, QWidget):
    """Player Window"""

    def __init__(
        self,
        args: Namespace,
        application: QApplication,
        icon: QIcon,
        video: bool,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self, args)
        QWidget.__init__(self)

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

        self.setWindowTitle("System Bridge - Player")
        self.setWindowIcon(icon)
        self.setWindowFlags(Qt.CustomizeWindowHint)

        # self.resize(460, 130) # Audio
        self.resize(480, 270)  # Video

        screen_geometry = application.primaryScreen().availableSize()

        self.move(
            screen_geometry.width() - self.width() - 8,
            screen_geometry.height() - self.height() - 8,
        )

        url = QUrl(
            f"""http://{self.args.hostname}:{self.args.frontend_port}/app/player?{urlencode({
                    "apiKey": self.args.api_key,
                    "apiPort": self.args.port,
                    "wsPort": self.args.websocket_port,
                })}"""
        )
        self.logger.debug("Opening url: %s", url)
        self.browser.load(url)
