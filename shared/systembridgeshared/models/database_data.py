"""System Bridge: Models - Database Data"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class DatabaseData(SQLModel, table=True):
    """Database Data"""

    key: str = Field(primary_key=True, nullable=False)
    value: Optional[str] = Field(default=None, nullable=True)
    timestamp: Optional[float] = Field(default=None, nullable=True)
