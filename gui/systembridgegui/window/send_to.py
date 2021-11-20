"""System Bridge GUI: Main Window"""
from argparse import Namespace
from typing import List
from PySide6.QtCore import Qt
from PySide6.QtGui import QCloseEvent, QIcon
from PySide6.QtWidgets import (
    QComboBox,
    QLabel,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)
from zeroconf.asyncio import AsyncServiceInfo

from ..base import Base
from ..util import get_or_create_event_loop
from ..zeroconf_browser import ZeroconfBrowser


class SendToWindow(Base, QWidget):
    """Send to window"""

    def __init__(
        self,
        args: Namespace,
        icon: QIcon,
    ) -> None:
        """Initialize the window"""
        Base.__init__(self, args)
        QWidget.__init__(self)

        self.services: List[AsyncServiceInfo] = []

        self.layout = QVBoxLayout(self)

        self.setWindowTitle("System Bridge - Send To")
        self.setWindowIcon(icon)
        self.resize(320, 380)

        label = QLabel("Send To:")
        font = label.font()
        font.setPointSize(28)
        label.setFont(font)
        label.setAlignment(Qt.AlignHCenter | Qt.AlignVCenter)

        self.combo_box = QComboBox()
        self.combo_box.currentIndexChanged.connect(lambda index: self.set_data(index))

        self.text_host = QTextEdit()
        self.text_host.setPlaceholderText("Host")

        self.text_port = QTextEdit(self.args.port)
        self.text_port.setPlaceholderText("Port")

        self.text_api_key = QTextEdit(self.args.api_key)
        self.text_api_key.setPlaceholderText("API Key")

        button = QPushButton("Send")
        button.clicked.connect(self.send)

        self.layout.addWidget(label, 1, Qt.AlignTop | Qt.AlignVCenter)
        self.layout.addWidget(self.combo_box, 1, Qt.AlignHCenter | Qt.AlignVCenter)
        self.layout.addWidget(self.text_host, 1, Qt.AlignHCenter | Qt.AlignVCenter)
        self.layout.addWidget(self.text_port, 1, Qt.AlignHCenter | Qt.AlignVCenter)
        self.layout.addWidget(self.text_api_key, 1, Qt.AlignHCenter | Qt.AlignVCenter)
        self.layout.addWidget(button, 1, Qt.AlignBottom | Qt.AlignVCenter)

        get_or_create_event_loop()

        ZeroconfBrowser(
            self.args,
            self.services_update,
        )

    # pylint: disable=invalid-name
    def closeEvent(self, event: QCloseEvent) -> None:
        """Close the window instead of closing the app"""
        event.ignore()
        self.hide()

    def setup(self) -> None:
        """Setup the window"""
        self.combo_box.clear()

        for service in self.services:
            host = service.properties.get(b"host")
            ip = service.properties.get(b"ip")

            self.combo_box.addItem(
                f"{host.decode('utf-8')} ({ip.decode('utf-8')})"
                if host is not None
                else service.name
            )

        self.combo_box.addItem("Manual")

        self.combo_box.setCurrentIndex(0)
        self.set_data(0)

    def set_data(self, index: int) -> None:
        """Set data"""
        if index < 0:
            return

        if index == self.combo_box.count() - 1:
            self.text_host.setEnabled(True)
            self.text_port.setEnabled(True)
            self.text_host.setText("")
            self.text_port.setText("")
        else:
            service = self.services[index]
            host = service.properties.get(b"host").decode("utf-8")
            port = service.properties.get(b"port").decode("utf-8")

            self.text_host.setEnabled(False)
            self.text_port.setEnabled(False)
            self.text_host.setText(host)
            self.text_port.setText(port)

        self.text_api_key.setText("")

    def send(self) -> None:
        """Send to bridge"""
        host = self.text_host.toPlainText()
        port = int(self.text_port.toPlainText())
        api_key = self.text_api_key.toPlainText()

        self.logger.info(
            "Sending to %s:%s with API Key: %s",
            host,
            port,
            api_key,
        )

        self.hide()

    def services_update(self, services: List[AsyncServiceInfo]) -> None:
        """Services update"""
        self.services = services
        self.logger.info("Services updated: %s", self.services)
