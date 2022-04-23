"""System Bridge GUI: Main window"""
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QFrame, QVBoxLayout
from systembridgeshared.base import Base
from systembridgeshared.const import SECRET_API_KEY, SETTING_PORT_API
from systembridgeshared.settings import Settings


class MainWindow(Base, QFrame):
    """Main Window"""

    def __init__(
        self,
        settings: Settings,
        icon: QIcon,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self)
        QFrame.__init__(self)

        self._settings = settings

        self.setWindowTitle("System Bridge")
        self.setWindowIcon(icon)

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self._browser = QWebEngineView()

        self.layout.addWidget(self._browser)

    # pylint: disable=invalid-name
    def closeEvent(
        self,
        event: QCloseEvent,
    ) -> None:
        """Close the window instead of closing the app"""
        event.ignore()
        self.hide()

    def setup(
        self,
        path: str,
    ) -> None:
        """Setup the window"""
        api_port = self._settings.get(SETTING_PORT_API)
        api_key = self._settings.get_secret(SECRET_API_KEY)
        url = QUrl(
            f"""http://localhost:{api_port}{path}?{urlencode({
                    "apiKey": api_key,
                    "apiPort": api_port,
                })}"""
        )
        self._logger.info("Open URL: %s", url)
        self._browser.load(url)
