"""System Bridge GUI: System Tray"""
from __future__ import annotations

import os
from typing import Callable
from webbrowser import open_new_tab

from PySide6.QtGui import QAction, QCursor, QIcon
from PySide6.QtWidgets import QMenu, QSystemTrayIcon, QWidget
from systembridgeshared.base import Base
from systembridgeshared.common import get_user_data_directory

PATH_BRIDGES_OPEN_ON = "/app/bridges/openon.html"
PATH_BRIDGES_SETUP = "/app/bridges/setup.html"
PATH_DATA = "/app/data.html"
PATH_SETTINGS = "/app/settings.html"

URL_DISCUSSIONS = "https://github.com/timmo001/system-bridge/discussions"
URL_DOCS = "https://system-bridge.timmo.dev"
URL_ISSUES = "https://github.com/timmo001/system-bridge/issues/new/choose"
URL_LATEST_RELEASE = "https://github.com/timmo001/system-bridge/releases/latest"


class SystemTray(Base, QSystemTrayIcon):
    """System Tray"""

    # pylint: disable=unsubscriptable-object
    def __init__(
        self,
        icon: QIcon,
        parent: QWidget,
        callback_exit_application: Callable,
        callback_show_window: Callable[[str, bool, int | None, int | None], None],
    ) -> None:
        """Initialize the system tray"""
        Base.__init__(self)
        QSystemTrayIcon.__init__(self, icon, parent)

        self._logger.info("Setup system tray")

        self.callback_show_window = callback_show_window

        self.activated.connect(self._on_activated)  # type: ignore

        menu = QMenu()

        action_settings: QAction = menu.addAction("Open Settings")
        action_settings.triggered.connect(self._show_settings)  # type: ignore

        action_data: QAction = menu.addAction("View Data")
        action_data.triggered.connect(self._show_data)  # type: ignore

        # menu.addSeparator()

        # action_bridges_setup = menu.addAction("Setup Bridges")
        # action_bridges_setup.triggered.connect(self._show_bridges_setup)

        # action_bridges_sendto = menu.addAction("Open URL On..")
        # action_bridges_sendto.triggered.connect(self._show_bridges_send_to)

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
        action_latest_release.triggered.connect(self._open_latest_releases)  # type: ignore

        menu_help = menu.addMenu("Help")

        action_docs: QAction = menu_help.addAction("Documentation / Website")
        action_docs.triggered.connect(self._open_docs)  # type: ignore

        action_feature: QAction = menu_help.addAction("Suggest a Feature")
        action_feature.triggered.connect(self._open_feature_request)  # type: ignore

        action_issue: QAction = menu_help.addAction("Report an issue")
        action_issue.triggered.connect(self._open_issues)  # type: ignore

        action_discussions: QAction = menu_help.addAction("Discussions")
        action_discussions.triggered.connect(self._open_discussions)  # type: ignore

        menu_help.addSeparator()

        action_log: QAction = menu_help.addAction("Open Log File")
        action_log.triggered.connect(self._open_log)  # type: ignore

        action_log_gui: QAction = menu_help.addAction("Open GUI Log File")
        action_log_gui.triggered.connect(self._open_gui_log)  # type: ignore

        menu.addSeparator()

        action_exit: QAction = menu.addAction("Exit")
        action_exit.triggered.connect(lambda: callback_exit_application(False))  # type: ignore

        self.setContextMenu(menu)

    def _on_activated(
        self,
        reason: int,
    ) -> None:
        """Handle the activated signal"""
        if reason == QSystemTrayIcon.Trigger:
            self.contextMenu().popup(QCursor.pos())

    def _open_latest_releases(self) -> None:
        """Open latest release"""
        self._logger.info("Open: %s", URL_LATEST_RELEASE)
        open_new_tab(URL_LATEST_RELEASE)

    def _open_docs(self) -> None:
        """Open documentation"""
        self._logger.info("Open: %s", URL_DOCS)
        open_new_tab(URL_DOCS)

    def _open_feature_request(self) -> None:
        """Open feature request"""
        self._logger.info("Open: %s", URL_ISSUES)
        open_new_tab(URL_ISSUES)

    def _open_issues(self) -> None:
        """Open issues"""
        self._logger.info("Open: %s", URL_ISSUES)
        open_new_tab(URL_ISSUES)

    def _open_discussions(self) -> None:
        """Open discussions"""
        self._logger.info("Open: %s", URL_DISCUSSIONS)
        open_new_tab(URL_DISCUSSIONS)

    def _open_log(self) -> None:
        """Open log"""
        log_path = os.path.join(get_user_data_directory(), "system-bridge.log")
        self._logger.info("Open: %s", log_path)
        open_new_tab(log_path)

    def _open_gui_log(self) -> None:
        """Open GUI log"""
        log_path = os.path.join(get_user_data_directory(), "system-bridge-gui.log")
        self._logger.info("Open: %s", log_path)
        open_new_tab(log_path)

    # def _show_bridges_send_to(self) -> None:
    #     """Show bridges open url on window"""
    #     self.callback_show_window(PATH_BRIDGES_OPEN_ON, False, 620, 420)

    # def _show_bridges_setup(self) -> None:
    #     """Show bridges setup window"""
    #     self.callback_show_window(PATH_BRIDGES_SETUP, False)

    def _show_data(self) -> None:
        """Show api data"""
        self.callback_show_window(PATH_DATA, False)  # type: ignore

    def _show_settings(self) -> None:
        """Show settings"""
        self.callback_show_window(PATH_SETTINGS, False)  # type: ignore
