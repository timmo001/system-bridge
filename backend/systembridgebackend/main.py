"""System Bridge: Main"""
import asyncio

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.server import Server
from systembridgebackend.settings import Settings


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge")
        self._setup()

    def _setup(self) -> None:
        """Setup"""
        self._logger.info("Setup")

        self._database = Database()
        self._settings = Settings(self._database)
        self._server = Server(self._database, self._settings)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Start the server
        self._server.start()
