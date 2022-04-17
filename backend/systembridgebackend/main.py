"""System Bridge: Main class"""
import asyncio

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.modules.cpu.update import CPUUpdate
from systembridgebackend.modules.disk.update import DiskUpdate
from systembridgebackend.modules.memory.update import MemoryUpdate
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

        classes = [
            CPUUpdate(self._database),
            MemoryUpdate(self._database),
            DiskUpdate(self._database),
        ]

        for cls in classes:
            self._loop.run_until_complete(cls.update_all_data())
