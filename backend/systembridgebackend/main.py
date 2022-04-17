"""System Bridge: Main class"""
import asyncio

from systembridgebackend.base import Base
from systembridgebackend.database import Database
from systembridgebackend.common import (
    COLUMN_KEY,
    COLUMN_TIMESTAMP,
    COLUMN_VALUE,
)
from systembridgebackend.modules.cpu import CPU


class Main(Base):
    """Main class"""

    def __init__(
        self,
    ) -> None:
        """Initialize the main class"""
        super().__init__()

        self._database = Database()

        self._logger.info("----------------------------------------------------")
        self._logger.info("System Bridge")
        self._logger.info("----------------------------------------------------")

        asyncio.run(self.setup())

    async def setup(self) -> None:
        """Setup application"""
        self._logger.info("Setup application")
        if not self._database.connected:
            self._database.connect()

        self._database.create_table(
            "cpu",
            [
                (COLUMN_KEY, "TEXT PRIMARY KEY"),
                (COLUMN_VALUE, "TEXT"),
                (COLUMN_TIMESTAMP, "INTEGER"),
            ],
        )

        cpu = CPU()
        self._database.write("cpu", "count", cpu.count())
        for key, value in self._named_tuple_to_json(cpu.freq()).items():
            self._database.write("cpu", f"frequency_{key}", value)
        count = 0
        for d in [self._named_tuple_to_json(freq) for freq in cpu.freq_per_cpu()]:
            for key, value in d.items():
                self._database.write("cpu", f"frequency_{count}_{key}", value)
            count += 1
        for key, value in self._named_tuple_to_json(cpu.stats()).items():
            self._database.write("cpu", f"stats_{key}", value)
        for key, value in self._named_tuple_to_json(cpu.times()).items():
            self._database.write("cpu", f"times_{key}", value)
        for key, value in self._named_tuple_to_json(cpu.times_percent()).items():
            self._database.write("cpu", f"times_percent_{key}", value)
        count = 0
        for d in [self._named_tuple_to_json(freq) for freq in cpu.times_per_cpu()]:
            for key, value in d.items():
                self._database.write("cpu", f"times_per_cpu_{count}_{key}", value)
            count += 1
        count = 0
        for d in [
            self._named_tuple_to_json(freq) for freq in cpu.times_per_cpu_percent()
        ]:
            for key, value in d.items():
                self._database.write(
                    "cpu", f"times_per_cpu_percent_{count}_{key}", value
                )
            count += 1
        self._database.write("cpu", f"usage", cpu.usage())
        count = 0
        for v in cpu.usage_per_cpu():
            self._database.write("cpu", f"usage_{count}", v)
            count += 1

        self._logger.info(self._database.read_table("cpu"))

    def _call_all_public_functions(self, x) -> None:
        """Call all functions"""
        public_method_names = [
            method
            for method in dir(x)
            if callable(getattr(x, method))
            if not method.startswith("_")
        ]  # 'private' methods start from _
        for method in public_method_names:
            self._logger.info("%s: %s", method, getattr(x, method)())

    def _named_tuple_to_json(self, x) -> dict:
        """Convert named tuple to JSON"""
        return x._asdict()
