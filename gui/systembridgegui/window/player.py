"""System Bridge GUI: Player Window"""
from argparse import Namespace
from urllib.parse import urlencode

from PySide6.QtCore import QPoint, QUrl
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QVBoxLayout, QWidget

from ..base import Base


class PlayerWindow(Base, QWidget):
    """Player Window"""

    def __init__(
        self,
        args: Namespace,
        icon: QIcon,
        video: bool,
    ) -> None:
        """Initialize the player window"""
        Base.__init__(self, args)
        QWidget.__init__(self)

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

        self.setWindowTitle("System Bridge - Player")
        self.setWindowIcon(icon)
        self.move(QPoint(0, 0))

        # self.resize(460, 130) # Audio
        self.resize(480, 270)  # Video

        url = QUrl(
            f"""http://{self.args.hostname}:{self.args.frontend_port}/app/player?{urlencode({
                    "apiKey": self.args.api_key,
                    "apiPort": self.args.port,
                    "wsPort": self.args.websocket_port,
                })}"""
        )
        self.logger.debug("Opening url: %s", url)
        self.browser.load(url)
