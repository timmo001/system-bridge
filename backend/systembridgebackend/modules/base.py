"""System Bridge: Module"""
from sqlite3 import Connection

from systembridgebackend import Base
from systembridgebackend.common import (
    COLUMN_KEY,
    COLUMN_TIMESTAMP,
    COLUMN_VALUE,
)


class ModuleUpdateBase(Base):
    """Module Base"""

    def __init__(
        self,
        database: Connection,
        table: str,
    ):
        super().__init__()

        self._database = database
        self._database.create_table(
            table,
            [
                (COLUMN_KEY, "TEXT PRIMARY KEY"),
                (COLUMN_VALUE, "TEXT"),
                (COLUMN_TIMESTAMP, "INTEGER"),
            ],
        )

    async def update_all_data(self) -> None:
        """Update data"""
        raise NotImplementedError()
