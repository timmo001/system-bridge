"""System Bridge: Server Base"""
from sqlite3 import Connection

from systembridgebackend import Base


class ServerBase(Base):
    """Server"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
