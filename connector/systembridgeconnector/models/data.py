# Data

from __future__ import annotations

from pydantic import BaseModel, Field

from systembridgeshared.models.battery import Battery
from systembridgeshared.models.bridge import Bridge
from systembridgeshared.models.cpu import Cpu
from systembridgeshared.models.disk import Disk
from systembridgeshared.models.display import Display
from systembridgeshared.models.gpu import Gpu
from systembridgeshared.models.memory import Memory
from systembridgeshared.models.network import Network
from systembridgeshared.models.sensors import Sensors
from systembridgeshared.models.system import System


class Data(BaseModel):
    """Data"""

    battery: Battery = Field(..., alias="battery")
    bridge: Bridge = Field(..., alias="bridge")
    cpu: Cpu = Field(..., alias="cpu")
    disk: Disk = Field(..., alias="disk")
    display: Display = Field(..., alias="display")
    gpu: Gpu = Field(..., alias="gpu")
    memory: Memory = Field(..., alias="memory")
    network: Network = Field(..., alias="network")
    sensors: Sensors = Field(..., alias="sensors")
    system: System = Field(..., alias="system")
