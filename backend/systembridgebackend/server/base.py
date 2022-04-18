"""System Bridge: Server Base"""
from sqlite3 import Connection

from systembridgebackend import Base


# pylint: disable=duplicate-code
class ServerBase(Base):  # pylint: disable=too-few-public-methods
    """Server Base"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
