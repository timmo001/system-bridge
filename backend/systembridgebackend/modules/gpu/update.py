"""System Bridge: Update GPU"""
from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.gpu import GPU


class GPUUpdate(ModuleUpdateBase):
    """GPU Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "gpu")
        self._gpu = GPU()

    async def update_core_clock(self) -> None:
        """Update core clock"""
        self._database.write("gpu", "core_clock", self._gpu.core_clock(self._database))

    async def update_core_load(self) -> None:
        """Update core load"""
        self._database.write("gpu", "core_load", self._gpu.core_load(self._database))

    async def update_memory_clock(self) -> None:
        """Update memory clock"""
        self._database.write(
            "gpu", "memory_clock", self._gpu.memory_clock(self._database)
        )

    async def update_memory_load(self) -> None:
        """Update memory load"""
        self._database.write(
            "gpu", "memory_load", self._gpu.memory_load(self._database)
        )

    async def update_power(self) -> None:
        """Update power"""
        self._database.write("gpu", "power", self._gpu.power(self._database))

    async def update_temperature(self) -> None:
        """Update temperature"""
        self._database.write(
            "gpu", "temperature", self._gpu.temperature(self._database)
        )

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_core_clock()
        await self.update_core_load()
        await self.update_memory_clock()
        await self.update_memory_load()
        await self.update_power()
        await self.update_temperature()
