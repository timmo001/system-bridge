"""System Bridge GUI: System Tray"""
from __future__ import annotations
from webbrowser import open_new_tab

from PySide6.QtGui import QAction, QCursor, QIcon
from PySide6.QtWidgets import QMenu, QSystemTrayIcon, QWidget

from systembridgeshared.base import Base


PATH_BRIDGES_OPEN_ON = "/app/bridges/openon"
PATH_BRIDGES_SETUP = "/app/bridges/setup"
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
        icon: QIcon,
        parent: QWidget,
        callback_exit_application: callable,
        callback_show_window: callable[[str, bool, int | None, int | None], None],
    ) -> None:
        """Initialize the system tray"""
        Base.__init__(self)
        QSystemTrayIcon.__init__(self, icon, parent)

        self.callback_show_window = callback_show_window

        self.activated.connect(self._on_activated)

        menu = QMenu()

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self._show_settings)

        action_bridges_setup = menu.addAction("Setup Bridges")
        action_bridges_setup.triggered.connect(self._show_bridges_setup)

        menu.addSeparator()

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self._show_data)

        menu.addSeparator()

        action_bridges_sendto = menu.addAction("Open URL On..")
        action_bridges_sendto.triggered.connect(self._show_bridges_send_to)

        menu.addSeparator()

        latest_version_text = "Latest Version"
        # if (
        #     information is not None
        #     and information.attributes is not None
        #     and information.updates is not None
        #     and information.updates.attributes is not None
        # ):
        #     if (
        #         information.updates.available is not None
        #         and information.updates.available
        #     ):
        #         latest_version_text = f"""Version {
        #                 information.updates.version.new
        #             } avaliable! ({
        #                 information.updates.version.current
        #             } -> {
        #                 information.updates.version.new
        #             })"""
        #     elif information.updates.newer:
        #         latest_version_text = f"""Version Newer ({
        #                 information.updates.version.current
        #             } > {
        #                 information.updates.version.new
        #             })"""
        #     else:
        #         latest_version_text = f"""Latest Version ({
        #                 information.updates.version.current
        #             })"""

        action_latest_release: QAction = menu.addAction(latest_version_text)
        action_latest_release.triggered.connect(self._open_latest_releases)

        menu_help = menu.addMenu("Help")

        action_docs: QAction = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self._open_docs)

        action_feature: QAction = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self._open_feature_request)

        action_issue: QAction = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self._open_issues)

        action_discussions: QAction = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self._open_discussions)

        menu_help.addSeparator()

        action_logs: QAction = menu_help.addAction("View Logs")
        action_logs.triggered.connect(self._show_logs)

        menu.addSeparator()

        action_exit: QAction = menu.addAction("Exit")
        action_exit.triggered.connect(callback_exit_application)

        self.setContextMenu(menu)

    def _on_activated(
        self,
        reason: int,
    ) -> None:
        """Handle the activated signal"""
        if reason == QSystemTrayIcon.Trigger:
            self.contextMenu().popup(QCursor.pos())

    @staticmethod
    def _open_latest_releases() -> None:
        """Open latest release"""
        open_new_tab(URL_LATEST_RELEASE)

    @staticmethod
    def _open_docs() -> None:
        """Open documentation"""
        open_new_tab(URL_DOCS)

    @staticmethod
    def _open_feature_request() -> None:
        """Open feature request"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def _open_issues() -> None:
        """Open issues"""
        open_new_tab(URL_ISSUES)

    @staticmethod
    def _open_discussions() -> None:
        """Open discussions"""
        open_new_tab(URL_DISCUSSIONS)

    def _show_bridges_send_to(self) -> None:
        """Show bridges open url on window"""
        self.callback_show_window(PATH_BRIDGES_OPEN_ON, False, 620, 420)

    def _show_bridges_setup(self) -> None:
        """Show bridges setup window"""
        self.callback_show_window(PATH_BRIDGES_SETUP, False)

    def _show_data(self) -> None:
        """Show api data"""
        self.callback_show_window(PATH_DATA, False)

    def _show_logs(self) -> None:
        """Show logs"""
        self.callback_show_window(PATH_LOGS, False)

    def _show_settings(self) -> None:
        """Show settings"""
        self.callback_show_window(PATH_SETTINGS, False)
