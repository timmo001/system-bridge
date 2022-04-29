"""System Bridge Shared: Database"""
from collections import OrderedDict
import os
from sqlite3 import Connection, connect
from time import time

from pandas import DataFrame, read_sql_query

from systembridgeshared.base import Base
from systembridgeshared.common import (
    convert_string_to_correct_type,
    get_user_data_directory,
)
from systembridgeshared.const import (
    COLUMN_HARDWARE_NAME,
    COLUMN_HARDWARE_TYPE,
    COLUMN_KEY,
    COLUMN_NAME,
    COLUMN_TIMESTAMP,
    COLUMN_TYPE,
    COLUMN_VALUE,
)


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

    def execute_sql(
        self,
        sql: str,
    ) -> None:
        """Execute SQL"""
        if not self.connected:
            self.connect()
        self._logger.debug("Executing SQL: %s", sql)
        self._connection.execute(sql)
        self._connection.commit()

    def execute_sql_with_params(
        self,
        sql: str,
        params: list[any],
    ) -> None:
        """Execute SQL"""
        self._logger.debug("Executing SQL: %s\n%s", sql, params)
        self._connection.execute(sql, params)
        self._connection.commit()

    def connect(self) -> None:
        """Connect to database"""
        self._connection = connect(
            os.path.join(get_user_data_directory(), "systembridge.db"),
            check_same_thread=False,
        )

    def close(self) -> None:
        """Close connection"""
        self._connection.close()
        self._connection = None

    def check_table_for_key(
        self,
        table_name: str,
        key: str,
    ) -> bool:
        """Check if key exists in table"""
        return self.read_table_by_key(table_name, key).empty

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
        self._logger.debug("Reading SQL: %s", query)
        return read_sql_query(query, self._connection)

    def create_table(
        self,
        table_name: str,
        columns: list[str, str],
    ) -> None:
        """Create table"""
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ("
        for column in columns:
            sql += f"{column[0]} {column[1]},"
        sql = sql[:-1] + ")"
        self.execute_sql(sql)

    def write(
        self,
        table_name: str,
        data_key: str,
        data_value: str,
        data_timestamp: float = None,
    ) -> None:
        """Write to table"""
        if data_timestamp is None:
            data_timestamp = time()
        self.execute_sql(
            f"""INSERT INTO {table_name} ({COLUMN_KEY}, {COLUMN_VALUE}, {COLUMN_TIMESTAMP})
             VALUES ("{data_key}", "{data_value}", {data_timestamp})
             ON CONFLICT({COLUMN_KEY}) DO
             UPDATE SET {COLUMN_VALUE} = "{data_value}", {COLUMN_TIMESTAMP} = {data_timestamp}
             WHERE {COLUMN_KEY} = "{data_key}"
            """.replace(
                "\n", ""
            ).replace(
                "            ", ""
            ),
        )

    def write_sensor(
        self,
        table_name: str,
        data_key: str,
        data_type: str,
        data_name: str,
        data_hardware_type: str,
        data_hardware_name: str,
        data_value: str,
        data_timestamp: float = None,
    ) -> None:
        """Write to table"""
        if data_timestamp is None:
            data_timestamp = time()
        self.execute_sql(
            f"""INSERT INTO {table_name} ({COLUMN_KEY}, {COLUMN_TYPE}, {COLUMN_NAME},
             {COLUMN_HARDWARE_TYPE}, {COLUMN_HARDWARE_NAME}, {COLUMN_VALUE}, {COLUMN_TIMESTAMP})
             VALUES ("{data_key}", "{data_type}", "{data_name}", "{data_hardware_type}",
             "{data_hardware_name}", "{data_value}", {data_timestamp})
             ON CONFLICT({COLUMN_KEY}) DO
             UPDATE SET {COLUMN_VALUE} = "{data_value}", {COLUMN_TIMESTAMP} = {data_timestamp}
             WHERE {COLUMN_KEY} = "{data_key}"
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
        for item in data_dict:
            data = {
                **data,
                item[COLUMN_KEY]: convert_string_to_correct_type(item[COLUMN_VALUE]),
                "last_updated": {
                    **data["last_updated"],
                    item[COLUMN_KEY]: item["timestamp"],
                },
            }
        output = OrderedDict(data)
        output.move_to_end("last_updated", last=True)

        return output
