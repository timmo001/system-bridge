import logging
import sys
from argparse import ArgumentParser
from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QVBoxLayout, QWidget
from urllib.parse import urlencode

_LOGGER = logging.getLogger(__name__)


class MyWidget(QWidget):
    def __init__(self, args) -> None:
        super().__init__()

        _LOGGER.setLevel(args.log_level.upper())

        _LOGGER.debug("args: %s", args)

        self.browser = QWebEngineView()

        self.browser.load(
            QUrl(
                f"""http://{args.hostname}:{args.port}/app/settings?{urlencode({
                    "apiKey": args.api_key,
                    "apiPort": args.port,
                    "wsPort": args.websocket_port,
                })}"""
            )
        )

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)

        self.layout.addWidget(self.browser)


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

    widget = MyWidget(args)
    widget.setWindowTitle("System Bridge")
    widget.setWindowIcon(QIcon("public/system-bridge-circle.png"))
    widget.resize(1280, 720)
    widget.show()

    sys.exit(app.exec())
