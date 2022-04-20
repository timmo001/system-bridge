"""System Bridge: Main"""
import asyncio
import logging
import os
from appdirs import AppDirs

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
        self._logger.info("System Bridge")

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

    logging.basicConfig(
        datefmt=DATE_FORMAT,
        format=FORMAT,
        handlers=[
            logging.FileHandler(os.path.join(user_data_dir, "system-bridge.log")),
        ],
        level=settings.get(SETTING_LOG_LEVEL),
    )

    Main(database, settings)
