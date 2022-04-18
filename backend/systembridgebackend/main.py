"""System Bridge: Main"""
from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.server import Server


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
        self._server = Server(self._database)

        # Start the server
        self._server.start()
