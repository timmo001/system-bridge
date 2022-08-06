"""System Bridge Shared: Database"""
from __future__ import annotations

from collections.abc import Mapping
import os
from time import time
from typing import Any, Optional, Union

from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.sql.expression import Select, SelectOfScalar

from .base import Base
from .common import convert_string_to_correct_type, get_user_data_directory
from .const import (
    MODEL_BATTERY,
    MODEL_CPU,
    MODEL_DISK,
    MODEL_DISPLAY,
    MODEL_GPU,
    MODEL_MEMORY,
    MODEL_NETWORK,
    MODEL_SECRETS,
    MODEL_SENSORS,
    MODEL_SETTINGS,
    MODEL_SYSTEM,
)
from .models.data import DataDict
from .models.database_data import (
    CPU,
    GPU,
    Battery,
    Data,
    Disk,
    Display,
    Memory,
    Network,
    Secrets,
    Settings,
    System,
)
from .models.database_data_bridge import Bridge
from .models.database_data_sensors import Sensors

TABLE_MAP: Mapping[str, Any] = {
    MODEL_BATTERY: Battery,
    MODEL_CPU: CPU,
    MODEL_DISK: Disk,
    MODEL_DISPLAY: Display,
    MODEL_GPU: GPU,
    MODEL_MEMORY: Memory,
    MODEL_NETWORK: Network,
    MODEL_SECRETS: Secrets,
    MODEL_SENSORS: Sensors,
    MODEL_SETTINGS: Settings,
    MODEL_SYSTEM: System,
}


TableDataType = Union[
    Battery,
    Bridge,
    CPU,
    Disk,
    Display,
    GPU,
    Memory,
    Network,
    Secrets,
    Sensors,
    Settings,
    System,
]


SelectOfScalar.inherit_cache = True  # type: ignore
Select.inherit_cache = True  # type: ignore


class Database(Base):
    """Database"""

    def __init__(self):
        """Initialise"""
        super().__init__()
        self._engine = create_engine(
            f"sqlite:///{os.path.join(get_user_data_directory(), 'systembridge.db')}"
        )
        SQLModel.metadata.create_all(
            self._engine,
            # tables=TABLES,
        )

    def clear_table(
        self,
        table: Any,
    ) -> None:
        """Clear table"""
        with Session(self._engine, autoflush=True) as session:
            for sensor in session.exec(select(table)).all():
                session.delete(sensor)
            session.commit()

    def get_data(
        self,
        table: Any,
    ) -> list[Any]:
        """Get data from database"""
        with Session(self._engine, autoflush=True) as session:
            return session.exec(select(table)).all()

    def get_data_by_key(
        self,
        table: Any,
        key: str,
    ) -> list[Data]:
        """Get data from database by key"""
        with Session(self._engine, autoflush=True) as session:
            return session.exec(select(table).where(table.key == key)).all()

    def get_data_item_by_key(
        self,
        table: Any,
        key: str,
    ) -> Optional[Data]:
        """Get data item from database by key"""
        with Session(self._engine, autoflush=True) as session:
            return session.exec(select(table).where(table.key == key)).first()

    def get_data_dict(
        self,
        table: Any,
    ) -> DataDict:
        """Get data from database as dictionary"""
        data: dict[str, Any] = {}
        data_last_updated: dict[str, float | None] = {}
        result = self.get_data(table)
        for item in result:
            if item.value is None:
                data[item.key] = None
            else:
                data[item.key] = convert_string_to_correct_type(item.value)
            if item.timestamp is None:
                data_last_updated[item.key] = None
            else:
                data_last_updated[item.key] = item.timestamp

        return DataDict(**data, last_updated=data_last_updated)

    def update_data(
        self,
        table,
        data: Any,
    ) -> None:
        """Update data"""
        with Session(self._engine, autoflush=True) as session:
            result = session.exec(select(table).where(table.key == data.key))
            if (old_data := result.first()) is None:
                data.timestamp = time()
                session.add(data)
            else:
                old_data.value = data.value
                old_data.timestamp = time()
                session.add(old_data)
            session.commit()
            if old_data is not None:
                session.refresh(old_data)
