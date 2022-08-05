"""System Bridge Shared: Database"""
from __future__ import annotations

from collections.abc import Mapping
import json
import os
from time import time
from typing import Any, List, Optional, Union

from sqlmodel import Column, Session, SQLModel, Table, create_engine, select

from systembridgeshared.base import Base
from systembridgeshared.common import (
    convert_string_to_correct_type,
    get_user_data_directory,
)
from systembridgeshared.const import (
    MODEL_BATTERY,
    MODEL_BRIDGE,
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
from systembridgeshared.models.data import DataDict
from systembridgeshared.models.database_data import (
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
from systembridgeshared.models.database_data_bridge import Bridge
from systembridgeshared.models.database_data_sensors import Sensors

# TABLES: List[Table] = [
#     Table(MODEL_BATTERY, Battery),
#     Table(MODEL_BRIDGE, Bridge),
#     Table(MODEL_CPU, CPU),
#     Table(MODEL_DISK, Disk),
#     Table(MODEL_DISPLAY, Display),
#     Table(MODEL_GPU, GPU),
#     Table(MODEL_MEMORY, Memory),
#     Table(MODEL_NETWORK, Network),
#     Table(MODEL_SECRETS, Secrets),
#     Table(MODEL_SENSORS, Sensors),
#     Table(MODEL_SETTINGS, Settings),
#     Table(MODEL_SYSTEM, System),
# ]

# TABLE_MAP: Mapping[str, Any] = {table.name: table.metadata for table in TABLES}

TABLE_MAP: Mapping[str, Any] = {
    MODEL_BATTERY: Battery,
    MODEL_BRIDGE: Bridge,
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

    def add_data(
        self,
        data: Any,
    ) -> None:
        """Add data to database"""
        with Session(self._engine) as session:
            session.add(data)
            session.commit()

    def create_data(
        self,
        key: str,
        value: Union[bool, float, int, str, list, dict, None],
        timestamp: Optional[float] = None,
    ) -> Data:
        """Create data"""
        if timestamp is None:
            timestamp = time()

        # Convert list or dict to JSON
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        else:
            value = str(value)

        return Data(
            key=key,
            value=value,
            timestamp=timestamp,
        )

    def create_sensor_data(
        self,
        key: str,
        type: str,
        name: str,
        hardware_type: str,
        hardware_name: str,
        value: Union[bool, float, int, str, list, dict, None],
        timestamp: Optional[float] = None,
    ) -> Sensors:
        """Create data"""
        if timestamp is None:
            timestamp = time()

        # Convert list or dict to JSON
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        else:
            value = str(value)

        return Sensors(
            key=key,
            type=type,
            name=name,
            hardware_type=hardware_type,
            hardware_name=hardware_name,
            value=value,
            timestamp=timestamp,
        )

    def get_data(
        self,
        table,
    ) -> List[Data]:
        """Get data from database"""
        with Session(self._engine) as session:
            return session.exec(select(table)).all()

    def get_data_by_key(
        self,
        table,
        key: str,
    ) -> List[Data]:
        """Get data from database by key"""
        with Session(self._engine) as session:
            return session.exec(select(table).where(table.key == key)).all()

    def get_data_item_by_key(
        self,
        table,
        key: str,
    ) -> Optional[Data]:
        """Get data item from database by key"""
        with Session(self._engine) as session:
            return session.exec(select(table).where(table.key == key)).first()

    def get_data_dict(
        self,
        table,
    ) -> DataDict:
        """Get data from database as dictionary"""
        data: dict[str, Any] = {"last_updated": {}}
        result = self.get_data(table)
        for item in result:
            if item.value is None:
                data[item.key] = None
            else:
                data[item.key] = convert_string_to_correct_type(item.value)
            if item.timestamp is None:
                data["last_updated"][item.key] = None
            else:
                data["last_updated"][item.key] = item.timestamp

        return DataDict(**data)
