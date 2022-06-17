"""System Bridge GUI: Player Window"""
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon, Qt
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QFrame, QVBoxLayout
from systembridgeshared.base import Base
from systembridgeshared.const import SECRET_API_KEY, SETTING_PORT_API
from systembridgeshared.settings import Settings


class PlayerWindow(Base, QFrame):
    """Player Window"""

    def __init__(
        self,
        settings: Settings,
        icon: QIcon,
        application: QApplication,
        video: bool,
        params: dict,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self)
        QFrame.__init__(
            self,
            WindowFlags=Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint,  # type: ignore
        )

        self._settings = settings

        self.layout = QVBoxLayout(self)  # type: ignore
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)

        self.setWindowTitle("System Bridge - Player")
        self.setWindowIcon(icon)

        if video:
            self.resize(480, 270)
        else:
            self.resize(460, 130)

        screen_geometry = application.primaryScreen().availableSize()

        self.move(
            screen_geometry.width() - self.width() - 8,
            screen_geometry.height() - self.height() - 8,
        )

        api_port = self._settings.get(SETTING_PORT_API)
        api_key = self._settings.get_secret(SECRET_API_KEY)
        url = QUrl(
            f"""http://localhost:{api_port}/app/player/{"video" if video else "audio"}?{urlencode({
                    "apiKey": api_key,
                    "apiPort": api_port,
                    **params,
                })}"""
        )
        self._logger.info("Open URL: %s", url)
        self.browser.load(url)
