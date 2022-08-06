"""System Bridge: System"""
from __future__ import annotations

import os
import platform
import re
import socket
from typing import Optional
import uuid

from aiogithubapi import (
    GitHubAPI,
    GitHubConnectionException,
    GitHubException,
    GitHubRatelimitException,
    GitHubReleaseModel,
)
from pkg_resources import parse_version
from plyer import uniqueid
from psutil import boot_time, users
from psutil._common import suser
from systembridgeshared.base import Base
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import System as DatabaseModel

from ..._version import __version__


class System(Base):
    """System"""

    def boot_time(self) -> float:
        """Get boot time"""
        return boot_time()

    def fqdn(self) -> str:
        """Get FQDN"""
        return socket.getfqdn()

    def hostname(self) -> str:
        """Get hostname"""
        return socket.gethostname()

    def ip_address_4(self) -> str:
        """Get IPv4 address"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]

    def mac_address(self) -> str:
        """Get MAC address"""
        # pylint: disable=consider-using-f-string
        return ":".join(re.findall("..", "%012x" % uuid.getnode()))

    def platform(self) -> str:
        """Get platform"""
        return platform.system()

    def platform_version(self) -> str:
        """Get platform version"""
        return platform.version()

    def uptime(self) -> float:
        """Get uptime"""
        return os.times()[0]

    def users(self) -> list[suser]:  # pylint: disable=unsubscriptable-object
        """Get users"""
        return users()

    def uuid(self) -> str:
        """Get UUID"""
        return uniqueid.id

    def version(self) -> str:
        """Get version"""
        return __version__.public()

    async def version_latest(self) -> Optional[GitHubReleaseModel]:
        """Get latest version from GitHub"""
        self._logger.info("Get latest version from GitHub")
        try:
            async with GitHubAPI() as github:
                releases = await github.repos.releases.list("timmo001/system-bridge")
            return releases.data[0] if releases.data else None
        except (
            GitHubConnectionException,
            GitHubRatelimitException,
        ) as error:
            self._logger.error("Error getting data from GitHub: %s", error)
        except GitHubException as error:
            self._logger.exception(
                "Unexpected error getting data from GitHub: %s", error
            )
        return None

    def version_newer_available(
        self,
        database: Database,
    ) -> Optional[bool]:
        """Check if newer version is available"""
        version_record = database.get_data_item_by_key(DatabaseModel, "version")
        if version_record is None:
            return None
        version = version_record.value
        latest_version_record = database.get_data_item_by_key(
            DatabaseModel, "version_latest"
        )
        if latest_version_record is None:
            return None
        latest_version = latest_version_record.value
        if version is not None and latest_version is not None:
            return parse_version(latest_version) > parse_version(version)
        return None
