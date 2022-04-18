"""System Bridge: Database"""
from collections import OrderedDict
from sqlite3 import Connection, connect
from time import time

from pandas import DataFrame, read_sql_query

from systembridgebackend import Base
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
    ) -> None:
        """Execute SQL"""
        if not self.connected:
            self.connect()
        self._logger.debug(f"Executing SQL: {sql}")
        self._connection.execute(sql)
        self._connection.commit()

    def _execute_with_params(
        self,
        sql: str,
        params: list[any],
    ) -> None:
        """Execute SQL"""
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
        if not self.connected:
            self.connect()
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

    def table_data_to_ordered_dict(
        self,
        table_name: str,
    ) -> OrderedDict:
        """Convert table to OrderedDict"""
        data_dict = self.read_table(table_name).to_dict(orient="records")
        data = {"last_updated": {}}
        for v in data_dict:
            data = {
                **data,
                v["key"]: v["value"],
                "last_updated": {
                    **data["last_updated"],
                    v["key"]: v["timestamp"],
                },
            }
        output = OrderedDict(data)
        output.move_to_end("last_updated", last=True)

        return output
