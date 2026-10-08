"""Modules."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .battery import Battery
from .cpu import CPU
from .disks import Disks
from .displays import Display
from .gpus import GPU
from .media import Media
from .memory import Memory
from .networks import Networks
from .processes import Process
from .sensors import Sensors
from .system import System


class Module(StrEnum):
    """Module Enum."""

    BATTERY = "battery"
    CPU = "cpu"
    DISKS = "disks"
    DISPLAYS = "displays"
    GPUS = "gpus"
    MEDIA = "media"
    MEMORY = "memory"
    NETWORKS = "networks"
    PROCESSES = "processes"
    SENSORS = "sensors"
    SYSTEM = "system"


@dataclass(slots=True)
class GetData:
    """Get Data."""

    modules: list[Module]


@dataclass(slots=True)
class RegisterDataListener(GetData):
    """Register Data Listener."""


@dataclass
class ModulesData:
    """Data."""

    battery: Battery | None = None
    cpu: CPU | None = None
    disks: Disks | None = None
    displays: list[Display] | None = None
    gpus: list[GPU] | None = None
    media: Media | None = None
    memory: Memory | None = None
    networks: Networks | None = None
    processes: list[Process] | None = None
    sensors: Sensors | None = None
    system: System | None = None
