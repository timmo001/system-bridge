"""System Bridge: Main class"""
import asyncio

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.modules.cpu.update import CPUUpdate
from systembridgebackend.server import Server


class Main(Base):
    """Main class"""

    def __init__(self) -> None:
        """Initialize the main class"""
        super().__init__()
        self._logger.info("System Bridge")

        self._database = Database()
        self._server = Server(self._database)
        self._loop = asyncio.new_event_loop()

        # Setup the application
        self._setup()

        # Start the server
        self._server.start()

    def _setup(self) -> None:
        """Setup application"""
        if not self._database.connected:
            self._database.connect()

        self._loop.create_task(CPUUpdate(self._database).update_all_data())
        # self._logger.info(self._database.read_table("cpu").to_json(orient="records"))
