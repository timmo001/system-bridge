"""System Bridge: Models - Database Data Sensor"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class DatabaseDataSensor(SQLModel, table=True):
    """Database Data Sensor"""

    key: str = Field(primary_key=True, nullable=False)
    type: str = Field(nullable=False)
    name: Optional[str] = Field(default=None, nullable=True)
    hardware_type: Optional[str] = Field(default=None, nullable=True)
    hardware_name: Optional[str] = Field(default=None, nullable=True)
    value: Optional[str] = Field(default=None, nullable=True)
    timestamp: Optional[float] = Field(default=None, nullable=True)
