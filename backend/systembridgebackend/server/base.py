"""System Bridge: Server Base"""

from systembridgebackend import Base
from systembridgebackend.database import Database


class ServerBase(Base):  # pylint: disable=too-few-public-methods
    """Server Base"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
