"""System Bridge: Module Base"""
from systembridgeshared.base import Base
from systembridgeshared.const import COLUMN_KEY, COLUMN_TIMESTAMP, COLUMN_VALUE
from systembridgeshared.database import Database


class ModuleUpdateBase(Base):
    """Module Base"""

    def __init__(
        self,
        database: Database,
        table: str,
    ):
        super().__init__()

        self._database = database
        self._database.create_table(
            table,
            [
                (COLUMN_KEY, "TEXT PRIMARY KEY"),
                (COLUMN_VALUE, "TEXT"),
                (COLUMN_TIMESTAMP, "DOUBLE"),
            ],
        )

    async def update_all_data(self) -> None:
        """Update data"""
        raise NotImplementedError()
