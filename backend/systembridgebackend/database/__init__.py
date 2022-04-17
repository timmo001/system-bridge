"""System Bridge: Database"""
from pandas import DataFrame, read_sql_query
from sqlite3 import Connection, connect
from time import time

from systembridgebackend.base import Base
from systembridgebackend.common import COLUMN_KEY, COLUMN_TIMESTAMP, COLUMN_VALUE


class Database(Base):
    """Database"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._connection: Connection = None

    @property
    def connected(self) -> bool:
        """Check if connected"""
        return self._connection is not None

    def _execute(
        self,
        sql: str,
        params: list = None,
    ) -> None:
        """Execute SQL"""
        if params is None:
            params = []
        self._logger.debug(f"Executing SQL: {sql}\n{params}")
        self._connection.execute(sql, params)
        self._connection.commit()

    def connect(self) -> None:
        self._connection = connect("systembridge.db")

    def close(self) -> None:
        self._connection.close()
        self._connection = None

    def read_table(
        self,
        table_name: str,
    ) -> DataFrame:
        """Read table"""
        return self.read_query(
            f"SELECT * FROM {table_name}",
        )

    def read_table_by_key(
        self,
        table_name: str,
        key: str,
    ) -> DataFrame:
        """Read table by key"""
        return self.read_query(
            f"SELECT * FROM {table_name} WHERE {COLUMN_KEY} = '{key}'",
        )

    def read_query(
        self,
        query: str,
    ) -> DataFrame:
        """Read SQL"""
        self._logger.debug(f"Reading SQL: {query}")
        return read_sql_query(query, self._connection)

    def create_table(
        self,
        table_name: str,
        columns: list[str, str],
    ) -> None:
        """Create table"""
        sql = "CREATE TABLE IF NOT EXISTS {} (".format(table_name)
        for column in columns:
            sql += "{} {},".format(column[0], column[1])
        sql = sql[:-1] + ")"
        self._execute(sql)

    def write(
        self,
        table_name: str,
        key: str,
        value: str,
        timestamp: int = None,
    ) -> None:
        """Write to table"""
        if timestamp is None:
            timestamp = int(time())
        self._execute(
            f"""INSERT INTO {table_name} ({COLUMN_KEY}, {COLUMN_VALUE}, {COLUMN_TIMESTAMP})
             VALUES ("{key}", "{value}", {timestamp})
             ON CONFLICT({COLUMN_KEY}) DO UPDATE SET {COLUMN_VALUE} = "{value}", {COLUMN_TIMESTAMP} = {timestamp}
             WHERE {COLUMN_KEY} = "{key}"
            """.replace(
                "\n", ""
            ).replace(
                "            ", ""
            ),
        )
