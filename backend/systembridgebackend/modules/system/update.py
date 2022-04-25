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

    async def update_fqdn(self) -> None:
        """Update FQDN"""
        self._database.write("system", "fqdn", self._system.fqdn())

    async def update_hostname(self) -> None:
        """Update hostname"""
        self._database.write("system", "hostname", self._system.hostname())

    async def update_ip_address_4(self) -> None:
        """Update IP address 4"""
        self._database.write("system", "ip_address_4", self._system.ip_address_4())

    async def update_mac_address(self) -> None:
        """Update MAC address"""
        self._database.write("system", "mac_address", self._system.mac_address())

    async def update_platform(self) -> None:
        """Update platform"""
        self._database.write("system", "platform", self._system.platform())

    async def update_platform_version(self) -> None:
        """Update platform version"""
        self._database.write(
            "system", "platform_version", self._system.platform_version()
        )

    async def update_uptime(self) -> None:
        """Update uptime"""
        self._database.write("system", "uptime", self._system.uptime())

    async def update_users(self) -> None:
        """Update users"""
        for user in self._system.users():
            for key, value in user._asdict().items():
                self._database.write(
                    "system", f"user_{user.name.replace(' ','_').lower()}_{key}", value
                )

    async def update_uuid(self) -> None:
        """Update UUID"""
        self._database.write("system", "uuid", self._system.uuid())

    async def update_version(self) -> None:
        """Update version"""
        self._database.write("system", "version", self._system.version())

    async def update_version_latest(self) -> None:
        """Update latest version"""
        release = await self._system.version_latest()
        self._logger.info("Release: %s", release)
        if release:
            self._database.write("system", "version_latest", release["tag"])

    async def update_all_data(self) -> None:
        """Update data"""
        await self.update_boot_time()
        await self.update_fqdn()
        await self.update_hostname()
        await self.update_ip_address_4()
        await self.update_mac_address()
        await self.update_platform()
        await self.update_platform_version()
        await self.update_uptime()
        await self.update_users()
        await self.update_uuid()
        await self.update_version()
        await self.update_version_latest()
