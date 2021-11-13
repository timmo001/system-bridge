import logging
import sys
from argparse import ArgumentParser, Namespace
from PySide6.QtCore import QUrl
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWidgets import QApplication, QVBoxLayout, QWidget
from urllib.parse import urlencode

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"


class MainWindow(QWidget):
    def __init__(self, args: Namespace) -> None:
        super().__init__()

        logging.basicConfig(
            format=FORMAT,
            datefmt=DATE_FORMAT,
            level=args.log_level.upper(),
        )
        logger = logging.getLogger(__name__)

        logger.debug("args: %s", args)

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

    widget = MainWindow(args)
    widget.setWindowTitle("System Bridge")
    widget.setWindowIcon(QIcon("public/system-bridge-circle.png"))
    widget.resize(1920, 1080)
    widget.show()

    sys.exit(app.exec())
