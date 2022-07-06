# Data

from __future__ import annotations

from pydantic import BaseModel, Field

from systembridgeconnector.models.battery import Battery
from systembridgeconnector.models.bridge import Bridge
from systembridgeconnector.models.cpu import Cpu
from systembridgeconnector.models.disk import Disk
from systembridgeconnector.models.display import Display
from systembridgeconnector.models.gpu import Gpu
from systembridgeconnector.models.memory import Memory
from systembridgeconnector.models.network import Network
from systembridgeconnector.models.sensors import Sensors
from systembridgeconnector.models.system import System


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
