"""System."""

from dataclasses import dataclass
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsWindowsSensor:
    """Sensors Windows Sensor."""

    id: str
    name: str
    type: str
    value: float | int | str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsWindowsHardware:
    """Sensors Windows Hardware."""

    id: str
    name: str
    type: str
    subhardware: list[SensorsWindowsHardware]
    sensors: list[SensorsWindowsSensor]

    def __post_init__(self):
        """Post Init."""
        if isinstance(self.subhardware, list) and all(
            isinstance(item, dict) for item in self.subhardware
        ):
            new_subhardware: list[SensorsWindowsHardware] = []
            for s in self.subhardware:
                subhardware: dict = cast(dict, s)
                new_subhardware.append(SensorsWindowsHardware(**subhardware))
            self.subhardware = new_subhardware

        if isinstance(self.sensors, list) and all(
            isinstance(item, dict) for item in self.sensors
        ):
            new_sensors: list[SensorsWindowsSensor] = []
            for s in self.sensors:
                sensor: dict = cast(dict, s)
                new_sensors.append(SensorsWindowsSensor(**sensor))
            self.sensors = new_sensors


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsNVIDIAChipset:
    """Sensors NVIDIA Chipset."""

    id: int
    name: str
    flags: str
    vendor_id: int
    vendor_name: str


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsNVIDIADisplay:
    """Sensors NVIDIA Display."""

    id: int
    name: str
    active: bool
    available: bool
    connected: bool
    dynamic: bool
    aspect_horizontal: int
    aspect_vertical: int
    brightness_current: int
    brightness_default: int
    brightness_max: int
    brightness_min: int
    color_depth: str
    connection_type: str
    pixel_clock: int
    refresh_rate: int
    resolution_horizontal: int
    resolution_vertical: int


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsNVIDIADriver:
    """Sensors NVIDIA Driver."""

    branch_version: str
    interface_version: str
    version: int


@filter_unexpected_fields
@dataclass(slots=True)
class SensorsNVIDIAGPU:
    """Sensors NVIDIA GPU."""

    id: int
    name: str
    bios_oem_revision: int | None = None
    bios_revision: int | None = None
    bios_version: str | None = None
    current_fan_speed_level: int | None = None
    current_fan_speed_rpm: int | None = None
    driver_model: int | None = None
    memory_available: int | None = None
    memory_capacity: int | None = None
    memory_maker: str | None = None
    serial: str | None = None
    system_type: str | None = None
    type: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Temperature:
    """Temperature."""

    key: str
    temperature: float
    high: float
    critical: float


@filter_unexpected_fields
@dataclass(slots=True)
class Fan:
    """Fan."""

    key: str
    name: str
    label: str
    speed_rpm: float | None = None
    speed_min: float | None = None
    speed_max: float | None = None


@dataclass
class SensorsNVIDIA:
    """Sensors NVIDIA."""

    chipset: SensorsNVIDIAChipset | None = None
    displays: list[SensorsNVIDIADisplay] | None = None
    driver: SensorsNVIDIADriver | None = None
    gpus: list[SensorsNVIDIAGPU] | None = None

    def __post_init__(self):
        """Post Init."""
        if isinstance(self.chipset, dict):
            self.chipset = SensorsNVIDIAChipset(**self.chipset)

        if isinstance(self.displays, list) and all(
            isinstance(item, dict) for item in self.displays
        ):
            new_displays: list[SensorsNVIDIADisplay] = []
            for s in self.displays:
                display: dict = cast(dict, s)
                new_displays.append(SensorsNVIDIADisplay(**display))
            self.displays = new_displays

        if isinstance(self.driver, dict):
            self.driver = SensorsNVIDIADriver(**self.driver)

        if isinstance(self.gpus, list) and all(
            isinstance(item, dict) for item in self.gpus
        ):
            new_gpus: list[SensorsNVIDIAGPU] = []
            for s in self.gpus:
                gpu: dict = cast(dict, s)
                new_gpus.append(SensorsNVIDIAGPU(**gpu))
            self.gpus = new_gpus


@dataclass
class SensorsWindows:
    """Sensors Windows."""

    hardware: list[SensorsWindowsHardware] | None = None
    nvidia: SensorsNVIDIA | None = None

    def __post_init__(self):
        """Post Init."""
        if isinstance(self.hardware, list) and all(
            isinstance(item, dict) for item in self.hardware
        ):
            new_hardware: list[SensorsWindowsHardware] = []
            for s in self.hardware:
                hardware: dict = cast(dict, s)
                new_hardware.append(SensorsWindowsHardware(**hardware))
            self.hardware = new_hardware

        if isinstance(self.nvidia, dict):
            self.nvidia = SensorsNVIDIA(**self.nvidia)


@dataclass
class Sensors:
    """Sensors."""

    fans: list[Fan] | None = None
    temperatures: list[Temperature] | None = None
    windows_sensors: SensorsWindows | None = None

    def __post_init__(self):
        """Post Init."""
        if isinstance(self.fans, list) and all(
            isinstance(item, dict) for item in self.fans
        ):
            new_fans: list[Fan] = []
            for f in self.fans:
                fan: dict = cast(dict, f)
                new_fans.append(Fan(**fan))
            self.fans = new_fans

        if isinstance(self.temperatures, list) and all(
            isinstance(item, dict) for item in self.temperatures
        ):
            new_temperatures: list[Temperature] = []
            for t in self.temperatures:
                temperature: dict = cast(dict, t)
                new_temperatures.append(Temperature(**temperature))
            self.temperatures = new_temperatures

        if isinstance(self.windows_sensors, dict):
            self.windows_sensors = SensorsWindows(**self.windows_sensors)
