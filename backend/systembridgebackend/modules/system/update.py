"""System Bridge: Update System"""
from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.system import System


class SystemUpdate(ModuleUpdateBase):
    """System Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "system")
        self._system = System()

    async def update_boot_time(self) -> None:
        """Update boot time"""
        self._database.write("system", "boot_time", self._system.boot_time())

    async def update_users(self) -> None:
        """Update users"""
        for user in self._system.users():
            for key, value in user._asdict().items():
                self._database.write(
                    "system", f"user_{user.name.replace(' ','_').lower()}_{key}", value
                )

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_boot_time()
        await self.update_users()
