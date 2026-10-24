"""History."""

from dataclasses import dataclass
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class HistorySample:
    """A reading of a metric. time is when it was taken, in Unix milliseconds."""

    time: int
    value: float


def _samples(samples: list[HistorySample]) -> list[HistorySample]:
    """Turn decoded samples into HistorySample."""
    return [
        HistorySample(**cast(dict, sample)) if isinstance(sample, dict) else sample
        for sample in samples
    ]


@filter_unexpected_fields
@dataclass(slots=True)
class SeriesHistory:
    """The history of one of several readings of a kind, such as a sensor."""

    id: str
    samples: list[HistorySample]

    def __post_init__(self) -> None:
        """Post Init."""
        self.samples = _samples(self.samples)


def _series(series: list[SeriesHistory]) -> list[SeriesHistory]:
    """Turn decoded series into SeriesHistory."""
    return [
        SeriesHistory(**cast(dict, item)) if isinstance(item, dict) else item
        for item in series
    ]


@filter_unexpected_fields
@dataclass(slots=True)
class GPUHistory:
    """The history of a GPU. Loads are percentages and power is in watts."""

    id: str
    core_load: list[HistorySample]
    memory_load: list[HistorySample]
    temperature: list[HistorySample]
    power: list[HistorySample]

    def __post_init__(self) -> None:
        """Post Init."""
        self.core_load = _samples(self.core_load)
        self.memory_load = _samples(self.memory_load)
        self.temperature = _samples(self.temperature)
        self.power = _samples(self.power)


@filter_unexpected_fields
@dataclass(slots=True)
class MetricHistory:
    """Graph readings from up to the last 24 hours.

    Usage is in percent, temperatures in °C, frequency in MHz, power in
    watts, fan speeds in RPM, and network and disk values are rates in bytes
    per second.
    """

    cpu: list[HistorySample]
    cpu_temperature: list[HistorySample]
    cpu_frequency: list[HistorySample]
    cpu_power: list[HistorySample]
    load_average: list[HistorySample]
    memory: list[HistorySample]
    swap: list[HistorySample]
    battery: list[HistorySample]
    system_power: list[HistorySample]
    network_receive: list[HistorySample]
    network_send: list[HistorySample]
    disk_read: list[HistorySample]
    disk_write: list[HistorySample]
    disk_temperatures: list[SeriesHistory]
    gpus: list[GPUHistory]
    temperatures: list[SeriesHistory]
    fans: list[SeriesHistory]

    def __post_init__(self) -> None:
        """Post Init."""
        self.cpu = _samples(self.cpu)
        self.cpu_temperature = _samples(self.cpu_temperature)
        self.cpu_frequency = _samples(self.cpu_frequency)
        self.cpu_power = _samples(self.cpu_power)
        self.load_average = _samples(self.load_average)
        self.memory = _samples(self.memory)
        self.swap = _samples(self.swap)
        self.battery = _samples(self.battery)
        self.system_power = _samples(self.system_power)
        self.network_receive = _samples(self.network_receive)
        self.network_send = _samples(self.network_send)
        self.disk_read = _samples(self.disk_read)
        self.disk_write = _samples(self.disk_write)
        self.disk_temperatures = _series(self.disk_temperatures)
        self.gpus = [
            GPUHistory(**cast(dict, gpu)) if isinstance(gpu, dict) else gpu
            for gpu in self.gpus
        ]
        self.temperatures = _series(self.temperatures)
        self.fans = _series(self.fans)
