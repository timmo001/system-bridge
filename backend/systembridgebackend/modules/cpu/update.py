"""System Bridge: Update CPU"""
import asyncio

from systembridgeshared.database import Database
from systembridgeshared.models.database_data import CPU as DatabaseModel

from . import CPU
from ..base import ModuleUpdateBase


class CPUUpdate(ModuleUpdateBase):
    """CPU Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._cpu = CPU()

    async def update_count(self) -> None:
        """Update CPU count"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="count",
                value=str(self._cpu.count()),
            ),
        )

    async def update_frequency(self) -> None:
        """Update CPU frequency"""
        for key, value in self._cpu.freq()._asdict().items():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"frequency_{key}",
                    value=value,
                ),
            )

    async def update_frequency_per_cpu(self) -> None:
        """Update CPU frequency per CPU"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.freq_per_cpu()]:
            for key, value in data.items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=f"frequency_{count}_{key}",
                        value=value,
                    ),
                )
            count += 1

    async def update_load_average(self) -> None:
        """Update load average"""
        avg_tuple = self._cpu.load_average()
        result = sum([avg_tuple[0], avg_tuple[1], avg_tuple[2]]) / 3
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="load_average",
                value=str(result),
            ),
        )

    async def update_power_package(self) -> None:
        """Update package power"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="power_package",
                value=str(self._cpu.power_package(self._database)),
            ),
        )

    async def update_power_per_cpu(self) -> None:
        """Update per cpu power"""
        if (result := self._cpu.power_per_cpu(self._database)) is None:
            return None
        for key, value in result:
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"power_per_cpu_{key}",
                    value=str(value),
                ),
            )

    async def update_stats(self) -> None:
        """Update stats"""
        for key, value in self._cpu.stats()._asdict().items():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"stats_{key}",
                    value=value,
                ),
            )

    async def update_temperature(self) -> None:
        """Update temperature"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="temperature",
                value=str(self._cpu.temperature(self._database)),
            ),
        )

    async def update_times(self) -> None:
        """Update times"""
        for key, value in self._cpu.times()._asdict().items():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"times_{key}",
                    value=value,
                ),
            )

    async def update_times_percent(self) -> None:
        """Update times percent"""
        for key, value in self._cpu.times_percent()._asdict().items():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"times_percent_{key}",
                    value=value,
                ),
            )

    async def update_times_per_cpu(self) -> None:
        """Update times per CPU"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.times_per_cpu()]:
            for key, value in data.items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=f"times_per_cpu_{count}_{key}",
                        value=value,
                    ),
                )
            count += 1

    async def update_times_per_cpu_percent(self) -> None:
        """Update times per CPU percent"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.times_per_cpu_percent()]:
            for key, value in data.items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=f"times_per_cpu_percent_{count}_{key}",
                        value=value,
                    ),
                )
            count += 1

    async def update_usage(self) -> None:
        """Update usage"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="usage",
                value=str(self._cpu.usage()),
            ),
        )

    async def update_usage_per_cpu(self) -> None:
        """Update usage per CPU"""
        count = 0
        for value in self._cpu.usage_per_cpu():
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key=f"usage_{count}",
                    value=str(value),
                ),
            )
            count += 1

    async def update_voltage(self) -> None:
        """Update voltage"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="voltage",
                value=str(self._cpu.voltage(self._database)),
            ),
        )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_count(),
                self.update_frequency(),
                self.update_frequency_per_cpu(),
                self.update_load_average(),
                self.update_power_package(),
                self.update_power_per_cpu(),
                self.update_stats(),
                self.update_temperature(),
                self.update_times(),
                self.update_times_percent(),
                self.update_times_per_cpu(),
                self.update_times_per_cpu_percent(),
                self.update_usage(),
                self.update_usage_per_cpu(),
                self.update_voltage(),
            ]
        )
