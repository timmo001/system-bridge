"""System Bridge: Main"""
import asyncio
import logging
import os
from appdirs import AppDirs
from colorlog import ColoredFormatter

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.server import Server
from systembridgebackend.settings import Settings, SETTING_LOG_LEVEL


DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"


class Main(Base):
    """Main"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge: Startup")

        self._database = database
        self._settings = settings
        self._server = Server(self._database, self._settings)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Start the server
        self._server.start()


if __name__ == "__main__":
    user_data_dir = AppDirs("systembridge", "timmo001").user_data_dir

    # Create User Data Directories
    os.makedirs(user_data_dir, exist_ok=True)

    database = Database()
    settings = Settings(database)

    # Set up logging
    log_level = settings.get(SETTING_LOG_LEVEL)

    logging.basicConfig(
        datefmt=DATE_FORMAT,
        format=FORMAT,
        level=log_level,
    )

    logging.getLogger().handlers[0].setFormatter(
        ColoredFormatter(
            f"%(log_color)s{FORMAT}%(reset)s",
            datefmt=DATE_FORMAT,
            reset=True,
            log_colors={
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "red",
            },
        )
    )

    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(user_data_dir, "system-bridge.log"),
        backupCount=1,
    )
    file_handler.doRollover()
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter(FORMAT, datefmt=DATE_FORMAT))

    logger = logging.getLogger("")
    logger.addHandler(file_handler)
    logger.setLevel(log_level)

    Main(database, settings)
