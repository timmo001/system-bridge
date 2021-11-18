"""System Bridge GUI: System Tray"""
from argparse import Namespace
from collections.abc import Callable
from typing import List
from webbrowser import open_new_tab

from PySide6.QtGui import QAction, QIcon
from PySide6.QtWidgets import QMenu, QSystemTrayIcon, QWidget
from systembridge.objects.information import Information
from zeroconf._services.info import ServiceInfo

from .base import Base
from .util import get_or_create_event_loop
from .zeroconf_browser import ZeroconfBrowser


PATH_DATA = "/app/data"
PATH_LOGS = "/app/logs"
PATH_SETTINGS = "/app/settings"

URL_DISCUSSIONS = "https://github.com/timmo001/system-bridge/discussions"
URL_DOCS = "https://system-bridge.timmo.dev"
URL_ISSUES = "https://github.com/timmo001/system-bridge/issues/new/choose"
URL_LATEST_RELEASE = "https://github.com/timmo001/system-bridge/releases/latest"


class SystemTray(Base, QSystemTrayIcon):
    """System Tray"""

    def __init__(
        self,
        args: Namespace,
        icon: QIcon,
        parent: QWidget,
        information: Information,
        callback_exit_application: Callable[[], None],
        callback_show_window: Callable[[str], None],
    ) -> None:
        """Initialize the system tray icon"""
        Base.__init__(self, args)
        QSystemTrayIcon.__init__(self, icon, parent)

        self.callback_show_window = callback_show_window

        menu = QMenu()

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self.show_settings)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self.show_data)

        menu.addSeparator()

        self.menu_sendto = menu.addMenu("Send to..")

        get_or_create_event_loop()

        ZeroconfBrowser(
            self.args,
            lambda services: self.update_sendto_menu(services),
        )

        menu.addSeparator()

        latest_version_text = "Latest Version"
        if (
            information is not None
            and information.attributes is not None
            and information.updates is not None
            and information.updates.attributes is not None
        ):
            if (
                information.updates.available is not None
                and information.updates.available
            ):
                latest_version_text = f"""Version {
                        information.updates.version.new
                    } avaliable! ({
                        information.updates.version.current
                    } -> {
                        information.updates.version.new
                    })"""
            elif information.updates.newer:
                latest_version_text = f"""Version Newer ({
                        information.updates.version.current
                    } > {
                        information.updates.version.new
                    })"""
            else:
                latest_version_text = f"""Latest Version ({
                        information.updates.version.current
                    })"""

        action_latest_release: QAction = menu.addAction(latest_version_text)
        action_latest_release.triggered.connect(self.open_latest_releases)

        menu_help = menu.addMenu("Help")

        action_docs: QAction = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self.open_docs)

        action_feature: QAction = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self.open_feature_request)

        action_issue: QAction = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self.open_issues)

        action_discussions: QAction = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self.open_discussions)

        menu_help.addSeparator()

        action_logs: QAction = menu_help.addAction("View Logs")
        action_logs.triggered.connect(self.show_logs)

        menu.addSeparator()

        action_exit: QAction = menu.addAction("Exit")
        action_exit.triggered.connect(callback_exit_application)

        self.setContextMenu(menu)

    @staticmethod
    def open_latest_releases() -> None:
        """Open latest release"""
        open_new_tab(URL_LATEST_RELEASE)

    @staticmethod
    def open_docs() -> None:
        """Open documentation"""
        open_new_tab(URL_DOCS)

    @staticmethod
    def open_feature_request() -> None:
        """Open feature request"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def open_issues() -> None:
        """Open issues"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def open_discussions() -> None:
        """Open discussions"""
        open_new_tab(URL_DISCUSSIONS)

    def send_to(self, service: ServiceInfo) -> None:
        """Send to device"""
        self.logger.info("Send to %s", service)

    def show_data(self) -> None:
        """Show api data"""
        self.callback_show_window(PATH_DATA)

    def show_logs(self) -> None:
        """Show logs"""
        self.callback_show_window(PATH_LOGS)

    def show_settings(self) -> None:
        """Show settings"""
        self.callback_show_window(PATH_SETTINGS)

    def update_sendto_menu(self, services: List[ServiceInfo]):
        """Update sendto menu"""
        self.menu_sendto.clear()

        for service in services:
            host = service.properties.get(b"host")
            ip = service.properties.get(b"ip")

            action_device = self.menu_sendto.addAction(
                f"{host.decode('utf-8')} ({ip.decode('utf-8')})"
                if host is not None
                else service.name
            )
            action_device.triggered.connect(lambda s=service: self.send_to(s))
