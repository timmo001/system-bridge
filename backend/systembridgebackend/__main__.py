"""System Bridge: Main"""
import logging

from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_AUTOSTART, SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from systembridgebackend.autostart import autostart_disable, autostart_enable
from systembridgebackend.server import Server


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge: Startup")

        autostart = settings.get(SETTING_AUTOSTART)
        self._logger.info("Autostart enabled: %s", autostart)
        if autostart:
            autostart_enable()
        else:
            autostart_disable()

        self._server = Server(database, settings)

        # Start the server
        self._server.start_server()


if __name__ == "__main__":

    database = Database()
    settings = Settings(database)

    log_level = settings.get(SETTING_LOG_LEVEL)
    setup_logger(log_level, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    Main()
