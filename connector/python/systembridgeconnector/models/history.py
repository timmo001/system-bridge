"""History."""

import csv
from dataclasses import dataclass
from datetime import UTC, datetime
import io
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields

HISTORY_CSV_HEADER = ("time", "metric", "id", "value", "unit")


@dataclass(slots=True)
class HistoryRow:
    """One reading in an exported history.

    time is in Unix milliseconds, and id names which GPU, disk, sensor or
    fan, and is empty for the rest.
    """

    time: int
    metric: str
    id: str
    value: float
    unit: str


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

    def rows(self) -> list[HistoryRow]:
        """Flatten into one row per reading, a metric at a time, oldest first.

        The metrics, IDs and units match the CLI's and the TypeScript
        connector's exports.
        """
        rows: list[HistoryRow] = []

        def add(
            metric: str, series_id: str, unit: str, samples: list[HistorySample]
        ) -> None:
            rows.extend(
                HistoryRow(sample.time, metric, series_id, sample.value, unit)
                for sample in samples
            )

        def add_each(metric: str, unit: str, series: list[SeriesHistory]) -> None:
            for item in series:
                add(metric, item.id, unit, item.samples)

        add("cpu", "", "%", self.cpu)
        add("cpu_temperature", "", "°C", self.cpu_temperature)
        add("cpu_frequency", "", "MHz", self.cpu_frequency)
        add("cpu_power", "", "W", self.cpu_power)
        add("load_average", "", "", self.load_average)
        add("memory", "", "%", self.memory)
        add("swap", "", "%", self.swap)
        add("battery", "", "%", self.battery)
        add("system_power", "", "W", self.system_power)
        add("network_receive", "", "B/s", self.network_receive)
        add("network_send", "", "B/s", self.network_send)
        add("disk_read", "", "B/s", self.disk_read)
        add("disk_write", "", "B/s", self.disk_write)
        add_each("disk_temperature", "°C", self.disk_temperatures)
        for gpu in self.gpus:
            add("gpu_core_load", gpu.id, "%", gpu.core_load)
            add("gpu_memory_load", gpu.id, "%", gpu.memory_load)
            add("gpu_temperature", gpu.id, "°C", gpu.temperature)
            add("gpu_power", gpu.id, "W", gpu.power)
        add_each("temperature", "°C", self.temperatures)
        add_each("fan", "RPM", self.fans)

        return rows

    def to_csv(self) -> str:
        """Get the history as CSV, one row per reading, with times in UTC."""
        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow(HISTORY_CSV_HEADER)
        for row in self.rows():
            writer.writerow(
                (
                    datetime.fromtimestamp(row.time / 1000, UTC)
                    .isoformat(timespec="milliseconds")
                    .replace("+00:00", "Z"),
                    row.metric,
                    row.id,
                    # Whole numbers without ".0", as the CLI writes them
                    str(int(row.value))
                    if float(row.value).is_integer()
                    else repr(float(row.value)),
                    row.unit,
                )
            )
        return output.getvalue()
