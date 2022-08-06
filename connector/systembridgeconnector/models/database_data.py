"""System Bridge: Models - Database Data"""

from __future__ import annotations

from typing import Optional

from sqlmodel import Field, SQLModel


class Data(SQLModel):
    """Database Data"""

    key: str = Field(primary_key=True, nullable=False)
    value: Optional[str] = Field(default=None, nullable=True)
    timestamp: Optional[float] = Field(default=None, nullable=True)


class Battery(Data, table=True):
    """Database Data Battery"""


class CPU(Data, table=True):
    """Database Data CPU"""


class Disk(Data, table=True):
    """Database Data Disk"""


class Display(Data, table=True):
    """Database Data Display"""


class GPU(Data, table=True):
    """Database Data GPU"""


class Memory(Data, table=True):
    """Database Data Memory"""


class Network(Data, table=True):
    """Database Data Network"""


class Secrets(Data, table=True):
    """Database Data Secrets"""


class Settings(Data, table=True):
    """Database Data Settings"""


class System(Data, table=True):
    """System"""
