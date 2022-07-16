"""System Bridge GUI: Player Window"""
from json import dumps
import sys
from urllib.parse import urlencode

from PySide6 import QtCore
from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon, Qt
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QFrame, QVBoxLayout
from systembridgeshared.base import Base
from systembridgeshared.const import (
    QUERY_API_KEY,
    QUERY_API_PORT,
    SECRET_API_KEY,
    SETTING_PORT_API,
)
from systembridgeshared.models.notification import Notification
from systembridgeshared.settings import Settings


class NotificationWindow(Base, QFrame):
    """Notification Window"""

    def __init__(
        self,
        settings: Settings,
        icon: QIcon,
        application: QApplication,
        notification: Notification,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self)
        QFrame.__init__(
            self,
            WindowFlags=Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint,  # type: ignore
        )

        self._settings = settings

        self.layout = QVBoxLayout(self)  # type: ignore
        self.layout.setContentsMargins(0, 0, 0, 0)  # type: ignore

        self.browser = QWebEngineView()

        self.layout.addWidget(self.browser)  # type: ignore

        self.setWindowIcon(icon)

        height: int = 48
        title_lines: int = 1 + int(round(len(notification.title) / 52, 0))
        self._logger.info("Title Lines: %s", title_lines)
        if title_lines > 1:
            height += 64 * title_lines
        if notification.message is not None:
            height += 24
            message_lines: int = 1 + int(round(len(notification.message) / 62, 0))
            self._logger.info("Message Lines: %s", message_lines)
            if message_lines > 1:
                height += 20 * message_lines
        if notification.image is not None:
            height += 280
        if notification.actions is not None and len(notification.actions) > 0:
            height += 72

        self._logger.info("Height: %s", height)

        self.resize(420, height)

        screen_geometry = application.primaryScreen().availableSize()

        self.move(
            screen_geometry.width() - self.width() - 8,
            screen_geometry.height() - self.height() - 8,
        )

        notification_dict = notification.dict(exclude_none=True)
        if "actions" in notification_dict:
            # Fix encoding issue by converting array to json
            notification_dict["actions"] = dumps(notification_dict["actions"])

        api_port = self._settings.get(SETTING_PORT_API)
        api_key = self._settings.get_secret(SECRET_API_KEY)
        url = QUrl(
            f"""http://localhost:{api_port}/app/notification.html?{urlencode({
                    QUERY_API_KEY: api_key,
                    QUERY_API_PORT: api_port,
                    **notification_dict,
                })}"""
        )
        self._logger.info("Open URL: %s", url)
        self.browser.load(url)

        self.browser.urlChanged.connect(self._url_changed)  # type: ignore

        if notification.timeout is None or notification.timeout < 1:
            notification.timeout = 5
        self.time_to_wait = int(notification.timeout)
        self.timer = QtCore.QTimer(self)
        self.timer.setInterval(1000)
        self.timer.timeout.connect(self._timer_changed)  # type: ignore

        self.showNormal()

        self.timer.start()

    def _timer_changed(self):
        """Change the content of the message box"""
        self.time_to_wait -= 1
        if self.time_to_wait < 0:
            self.close()
            sys.exit(0)

    def _url_changed(self, url: QUrl):
        """Handle URL changes"""
        self._logger.info("URL Changed: %s", url)
        if url.host() == "close.window":
            self._logger.info("Close Window Requested. Closing Window.")
            self.close()
            sys.exit(0)
