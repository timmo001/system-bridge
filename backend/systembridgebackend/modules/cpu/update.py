"""System Bridge: Main class"""
from sqlite3 import Connection

from systembridgebackend.modules import ModuleUpdateBase
from systembridgebackend.modules.cpu import CPU


class CPUUpdate(ModuleUpdateBase):
    """CPU Update"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__(database, "cpu")
        self._cpu = CPU()

    async def update_count(self) -> None:
        """Update CPU count"""
        self._database.write("cpu", "count", self._cpu.count())

    async def update_frequency(self) -> None:
        """Update CPU frequency"""
        for key, value in self._cpu.freq()._asdict().items():
            self._database.write("cpu", f"frequency_{key}", value)

    async def update_frequency_per_cpu(self) -> None:
        """Update CPU frequency per CPU"""
        count = 0
        for d in [freq._asdict() for freq in self._cpu.freq_per_cpu()]:
            for key, value in d.items():
                self._database.write("cpu", f"frequency_{count}_{key}", value)
            count += 1

    async def update_stats(self) -> None:
        """Update stats"""
        for key, value in self._cpu.stats()._asdict().items():
            self._database.write("cpu", f"stats_{key}", value)

    async def update_times(self) -> None:
        """Update times"""
        for key, value in self._cpu.times()._asdict().items():
            self._database.write("cpu", f"times_{key}", value)

    async def update_times_percent(self) -> None:
        """Update times percent"""
        for key, value in self._cpu.times_percent()._asdict().items():
            self._database.write("cpu", f"times_percent_{key}", value)

    async def update_times_per_cpu(self) -> None:
        """Update times per CPU"""
        count = 0
        for d in [freq._asdict() for freq in self._cpu.times_per_cpu()]:
            for key, value in d.items():
                self._database.write("cpu", f"times_per_cpu_{count}_{key}", value)
            count += 1

    async def update_times_per_cpu_percent(self) -> None:
        """Update times per CPU percent"""
        count = 0
        for d in [freq._asdict() for freq in self._cpu.times_per_cpu_percent()]:
            for key, value in d.items():
                self._database.write(
                    "cpu", f"times_per_cpu_percent_{count}_{key}", value
                )
            count += 1

    async def update_usage(self) -> None:
        """Update usage"""
        self._database.write("cpu", f"usage", self._cpu.usage())

    async def update_usage_per_cpu(self) -> None:
        """Update usage per CPU"""
        count = 0
        for v in self._cpu.usage_per_cpu():
            self._database.write("cpu", f"usage_{count}", v)
            count += 1

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_count()
        await self.update_frequency()
        await self.update_frequency_per_cpu()
        await self.update_stats()
        await self.update_times()
        await self.update_times_percent()
        await self.update_times_per_cpu()
        await self.update_times_per_cpu_percent()
        await self.update_usage()
        await self.update_usage_per_cpu()
