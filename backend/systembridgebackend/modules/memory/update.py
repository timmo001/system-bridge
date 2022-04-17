"""System Bridge: Main class"""
from sqlite3 import Connection

from systembridgebackend.modules import ModuleUpdateBase
from systembridgebackend.modules.memory import Memory


class MemoryUpdate(ModuleUpdateBase):
    """Memory Update"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__(database, "memory")
        self._memory = Memory()

    async def update_swap_memory(self) -> None:
        """Update Swap Memory"""
        for key, value in self._memory.swap_memory()._asdict().items():
            self._database.write("memory", f"swap_{key}", value)

    async def update_virtual_memory(self) -> None:
        """Update Virtual Memory"""
        for key, value in self._memory.virtual_memory()._asdict().items():
            self._database.write("memory", f"virtual_{key}", value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_swap_memory()
        await self.update_virtual_memory()
