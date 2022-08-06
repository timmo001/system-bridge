"""System Bridge: Update System"""
import asyncio

from systembridgeshared.database import Database
from systembridgeshared.models.database_data import System as DatabaseModel

from . import System
from ..base import ModuleUpdateBase


class SystemUpdate(ModuleUpdateBase):
    """System Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._system = System()

    async def update_boot_time(self) -> None:
        """Update boot time"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="boot_time",
                value=str(self._system.boot_time()),
            ),
        )

    async def update_fqdn(self) -> None:
        """Update FQDN"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="fqdn",
                value=self._system.fqdn(),
            ),
        )

    async def update_hostname(self) -> None:
        """Update hostname"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="hostname",
                value=self._system.hostname(),
            ),
        )

    async def update_ip_address_4(self) -> None:
        """Update IP address 4"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="ip_address_4",
                value=self._system.ip_address_4(),
            ),
        )

    async def update_mac_address(self) -> None:
        """Update MAC address"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="mac_address",
                value=self._system.mac_address(),
            ),
        )

    async def update_platform(self) -> None:
        """Update platform"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="platform",
                value=self._system.platform(),
            ),
        )

    async def update_platform_version(self) -> None:
        """Update platform version"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="platform_version",
                value=self._system.platform_version(),
            ),
        )

    async def update_uptime(self) -> None:
        """Update uptime"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="uptime",
                value=str(self._system.uptime()),
            ),
        )

    async def update_users(self) -> None:
        """Update users"""
        for user in self._system.users():
            for key, value in user._asdict().items():
                self._database.update_data(
                    DatabaseModel,
                    DatabaseModel(
                        key=f"user_{user.name.replace(' ','_').lower()}_{key}",
                        value=value,
                    ),
                )

    async def update_uuid(self) -> None:
        """Update UUID"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="uuid",
                value=self._system.uuid(),
            ),
        )

    async def update_version(self) -> None:
        """Update version"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="version",
                value=self._system.version(),
            ),
        )

    async def update_version_latest(self) -> None:
        """Update latest version"""
        release = await self._system.version_latest()
        if release and release.tag_name:
            self._database.update_data(
                DatabaseModel,
                DatabaseModel(
                    key="version_latest",
                    value=release.tag_name.replace("v", "")
                    if release is not None
                    else None,
                ),
            )

    async def update_version_newer_available(self) -> None:
        """Update newer version available"""
        value = self._system.version_newer_available(self._database)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="version_newer_available",
                value=str(value) if value else str(False),
            ),
        )

    async def update_all_data(self) -> None:
        """Update data"""
        await asyncio.gather(
            *[
                self.update_boot_time(),
                self.update_fqdn(),
                self.update_hostname(),
                self.update_ip_address_4(),
                self.update_mac_address(),
                self.update_platform(),
                self.update_platform_version(),
                self.update_uptime(),
                self.update_users(),
                self.update_uuid(),
                self.update_version(),
                self.update_version_latest(),
            ]
        )
        # Run after other version updates
        await self.update_version_newer_available()
