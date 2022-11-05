"""System Bridge: Models - Database Data Remote Bridge"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class RemoteBridge(SQLModel, table=True):
    """Database Data Remote Bridge"""

    key: str = Field(primary_key=True, nullable=False)
    name: str = Field(nullable=False)
    host: str = Field(default=None, nullable=False)
    port: str = Field(default=9170, nullable=False)
    api_key: str = Field(nullable=False)
    timestamp: Optional[float] = Field(default=None, nullable=True)
