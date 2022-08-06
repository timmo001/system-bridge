# Data

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Extra, Field

from .battery import Battery
from .cpu import Cpu
from .disk import Disk
from .display import Display
from .gpu import Gpu
from .memory import Memory
from .network import Network
from .sensors import Sensors
from .system import System


class Data(BaseModel):
    """Data"""

    battery: Battery = Field(..., alias="battery")
    cpu: Cpu = Field(..., alias="cpu")
    disk: Disk = Field(..., alias="disk")
    display: Display = Field(..., alias="display")
    gpu: Gpu = Field(..., alias="gpu")
    memory: Memory = Field(..., alias="memory")
    network: Network = Field(..., alias="network")
    sensors: Sensors = Field(..., alias="sensors")
    system: System = Field(..., alias="system")


class DataDict(BaseModel):
    class Config:
        extra = Extra.allow

    last_updated: dict[str, Optional[float]] = Field(..., description="Last updated")
