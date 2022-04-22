"""System Bridge GUI: Main window"""
from urllib.parse import urlencode

from PySide6.QtCore import QUrl
from PySide6.QtGui import QCloseEvent, QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QFrame, QVBoxLayout

from systembridgeshared.base import Base


class MainWindow(Base, QFrame):
    """Main Window"""

    def __init__(
        self,
        icon: QIcon,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self)
        QFrame.__init__(self)

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
        # url = QUrl(
        #     f"""http://{self.args.hostname}:{self.args.frontend_port}{path}?{urlencode({
        #             "apiKey": self.args.api_key,
        #             "apiPort": self.args.port,
        #         })}"""
        # )
        # self._logger.debug("Opening url: %s", url)
        # self._browser.load(url)
