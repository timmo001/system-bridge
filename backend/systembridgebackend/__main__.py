"""System Bridge: Main"""
import logging
import platform
import sys

from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_AUTOSTART, SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from systembridgebackend.autostart import autostart_disable, autostart_enable
from systembridgebackend.modules.system import System
from systembridgebackend.server import Server
from systembridgebackend.shortcut import create_shortcuts


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        if "--init" in sys.argv:
            self._logger.info("Initialized application. Exiting now.")
            sys.exit(0)

        self._logger.info("System Bridge %s: Startup", System().version())

        if "--cli" not in sys.argv:
            autostart = settings.get(SETTING_AUTOSTART)
            self._logger.info("Autostart enabled: %s", autostart)
            if autostart:
                autostart_enable()
            else:
                autostart_disable()

            create_shortcuts()

        if platform.system() == "Windows" and "--silent" in sys.argv:
            self._logger.info("Hide console")
            # pylint: disable=import-error, import-outside-toplevel
            from win32con import SW_HIDE
            from win32gui import GetForegroundWindow, ShowWindow

            ShowWindow(GetForegroundWindow(), SW_HIDE)  # type: ignore

        self._server = Server(database, settings)

        # Start the server
        self._server.start_server()


if __name__ == "__main__":

    database = Database()
    settings = Settings(database)

    LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
    setup_logger(LOG_LEVEL, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    Main()
