"""System Bridge GUI: Main Window"""
from argparse import Namespace
from typing import List
from PySide6.QtCore import Qt
from PySide6.QtGui import QCloseEvent, QIcon
from PySide6.QtWidgets import QComboBox, QLabel, QPushButton, QVBoxLayout, QWidget
from zeroconf.asyncio import AsyncServiceInfo

from ..base import Base
from ..util import get_or_create_event_loop
from ..zeroconf_browser import ZeroconfBrowser


class SendToWindow(Base, QWidget):
    """Send to Window"""

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
        # self.combo_box.currentIndexChanged.connect(
        #     lambda index: self.logger.info("Index changed: %s", index)
        # )

        button = QPushButton("Send")
        button.clicked.connect(self.send)

        self.layout.addWidget(label, 1, Qt.AlignTop | Qt.AlignVCenter)
        self.layout.addWidget(self.combo_box, 1, Qt.AlignHCenter | Qt.AlignVCenter)
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

        self.combo_box.setCurrentIndex(0)

    def send(self) -> None:
        """Send the selected service"""
        index = self.combo_box.currentIndex()
        if index < 0:
            return

        service = self.services[index]
        host = service.properties.get(b"host")
        ip = service.properties.get(b"ip")

        self.logger.info(
            "Sending to: %s (%s)",
            host.decode("utf-8") if host is not None else service.name,
            ip.decode("utf-8") if ip is not None else "",
        )

        self.hide()

    def services_update(self, services: List[AsyncServiceInfo]) -> None:
        """Services update"""
        self.services = services
        self.logger.info("Services updated: %s", self.services)
