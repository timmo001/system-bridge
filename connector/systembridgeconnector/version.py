"""System Bridge Connector: Version"""
from __future__ import annotations

from typing import Optional

from aiohttp import ClientSession
from pkg_resources import parse_version

from .base import Base
from .exceptions import ConnectionErrorException
from .http_client import HTTPClient
from .models.system import System

SUPPORTED_VERSION = "3.1.2"


class Version(Base):
    """Version"""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        api_key: str,
        session: Optional[ClientSession] = None,
    ) -> None:
        """Initialize the client."""
        super().__init__()
        self._http_client = HTTPClient(
            api_host,
            api_port,
            api_key,
            session,
        )

    async def check_supported(self) -> bool:
        """Check if the system is running a supported version."""
        if (
            await self.check_version_2() is None
            and (version := await self.check_version_3()) is not None
        ):
            return parse_version(version) >= parse_version(SUPPORTED_VERSION)
        return False

    async def check_version_2(self) -> Optional[str]:
        """Check if the system is running v2.x.x version."""
        try:
            information = await self._http_client.get("/information")
            if (
                information
                and information.get("version")
                and (
                    information.get("version").startswith("2")
                    or information.get("version").startswith("v2")
                )
            ):
                return information["version"]
        except ConnectionErrorException as exception:
            error: dict = exception.args[0]
            if (
                error is not None  # pylint: disable=invalid-sequence-index
                and error["status"] == 404  # pylint: disable=invalid-sequence-index
            ):
                return None
            raise exception
        return None

    async def check_version_3(self) -> Optional[str]:
        """Check if the system is running v3.x.x version."""
        try:
            response = await self._http_client.get("/api/data/system")
            system = System(**response)
            if (
                system
                and system.version is not None
                and parse_version(system.version) >= parse_version("3.0.0")
            ):
                return system.version
        except ConnectionErrorException as exception:
            error: dict = exception.args[0]
            if (
                error is not None  # pylint: disable=invalid-sequence-index
                and error["status"] == 404  # pylint: disable=invalid-sequence-index
            ):
                return None
            raise exception
        return None
