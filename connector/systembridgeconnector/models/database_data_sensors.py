"""System Bridge: Models - Database Data Sensors"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field

from .database_data import Data


class Sensors(Data, table=True):
    """Database Data Sensors"""

    type: str = Field(nullable=False)
    name: Optional[str] = Field(default=None, nullable=True)
    hardware_type: Optional[str] = Field(default=None, nullable=True)
    hardware_name: Optional[str] = Field(default=None, nullable=True)
