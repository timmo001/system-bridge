"""System Bridge: System"""
import io
import os
import platform
import re
import socket
import uuid
from aiogithubapi import (
    GitHubAPI,
    GitHubConnectionException,
    GitHubException,
    GitHubRatelimitException,
)
from plyer import uniqueid
from psutil import boot_time, users
from psutil._common import suser

from systembridgeshared.base import Base


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
        # Get version from version.txt
        with io.open(
            os.path.join(os.path.dirname(__file__), "../../../../version.txt"),
            encoding="utf-8",
        ) as file:
            return file.read().splitlines()[0]

    async def version_latest(self) -> dict:
        """Get latest version from GitHub"""
        self._logger.info("Getting latest version from GitHub")
        with io.open(
            os.path.join(os.path.dirname(__file__), "github_version.graphql"),
            encoding="utf-8",
        ) as file:
            query = file.read()
        self._logger.info("Query: %s", query)
        try:
            async with GitHubAPI() as github:
                self._logger.info("GitHubAPI")
                response = await github.graphql(
                    query,
                    variables={
                        "owner": "timmo001",
                        "repo": "system-bridge",
                    },
                )
            self._logger.info("GitHub response: %s", response)
            return response.data["data"]["repository"]["release"]
        except (
            GitHubConnectionException,
            GitHubRatelimitException,
        ) as error:
            self._logger.error("Error getting data from GitHub: %s", error)
        except GitHubException as error:
            self._logger.exception(
                "Unexpected error getting data from GitHub: %s", error
            )
