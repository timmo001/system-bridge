"""System Bridge: Update Memory"""
from systembridgebackend.database import Database
from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.memory import Memory


class MemoryUpdate(ModuleUpdateBase):
    """Memory Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "memory")
        self._memory = Memory()

    async def update_swap(self) -> None:
        """Update Swap Memory"""
        for key, value in self._memory.swap()._asdict().items():
            self._database.write("memory", f"swap_{key}", value)

    async def update_virtual(self) -> None:
        """Update Virtual Memory"""
        for key, value in self._memory.virtual()._asdict().items():
            self._database.write("memory", f"virtual_{key}", value)

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_swap()
        await self.update_virtual()
