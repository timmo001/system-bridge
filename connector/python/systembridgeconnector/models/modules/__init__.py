"""Modules."""

from dataclasses import dataclass
from enum import StrEnum

from .audio import Audio
from .battery import Battery
from .bluetooth import Bluetooth
from .cpu import CPU
from .discord import Discord
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

    AUDIO = "audio"
    BATTERY = "battery"
    BLUETOOTH = "bluetooth"
    CPU = "cpu"
    DISCORD = "discord"
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

    audio: Audio | None = None
    battery: Battery | None = None
    bluetooth: Bluetooth | None = None
    cpu: CPU | None = None
    discord: Discord | None = None
    disks: Disks | None = None
    displays: list[Display] | None = None
    gpus: list[GPU] | None = None
    media: Media | None = None
    memory: Memory | None = None
    networks: Networks | None = None
    processes: list[Process] | None = None
    sensors: Sensors | None = None
    system: System | None = None
