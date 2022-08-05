"""System Bridge: Models - Database Data Bridge"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class Bridge(SQLModel, table=True):
    """Database Data Bridge"""

    uuid: str = Field(primary_key=True, nullable=False)
    name: str = Field(nullable=False)
    address: str = Field(nullable=False)
    fqdn: Optional[str] = Field(default=None, nullable=True)
    host: str = Field(default=None, nullable=True)
    ip: str = Field(nullable=False)
    mac: str = Field(nullable=False)
    port: str = Field(nullable=False)
    version: str = Field(nullable=False)
    websocket_address: str = Field(nullable=False)
    websocket_port: str = Field(nullable=False)
    active: Optional[int] = Field(default=None, nullable=True)
    last_active_timestamp: Optional[float] = Field(default=None, nullable=True)
    timestamp: Optional[float] = Field(default=None, nullable=True)
