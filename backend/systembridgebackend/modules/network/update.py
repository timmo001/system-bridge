"""System Bridge: Update Network"""
import asyncio

from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.network import Network


class NetworkUpdate(ModuleUpdateBase):
    """Network Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "network")
        self._network = Network()

    async def update_stats(self) -> None:
        """Update stats"""
        for key, value in self._network.stats().items():
            for subkey, subvalue in value._asdict().items():
                self._database.write(
                    "network", f"stat_{key.replace(' ', '')}_{subkey}", subvalue
                )

    async def update_io_counters(self) -> None:
        """Update IO counters"""
        for key, value in self._network.io_counters()._asdict().items():
            self._database.write("network", f"io_counters_{key}", value)

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_stats(),
                self.update_io_counters(),
            ]
        )
