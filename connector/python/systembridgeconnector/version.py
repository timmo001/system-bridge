"""Version."""

from aiohttp import ClientSession
from packaging.version import parse

from .base import Base
from .exceptions import ConnectionErrorException
from .http_client import HTTPClient
from .models.modules.system import System

SUPPORTED_VERSION = "4.0.2"


class Version(Base):
    """Version."""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        token: str,
        session: ClientSession | None = None,
    ) -> None:
        """Initialise the client."""
        super().__init__()
        self._http_client = HTTPClient(
            api_host,
            api_port,
            token,
            session,
        )

    async def check_supported(self) -> bool:
        """Check if the system is running a supported version."""
        if (version := await self.check_version()) is not None:
            return parse(version) >= parse(SUPPORTED_VERSION)
        return False

    async def check_version(self) -> str | None:
        """Check the system version for 3.x.x and above."""
        try:
            response = await self._http_client.get("/api/data/system")
            system = System(**response)
            if (
                system
                and system.version is not None
                and parse(system.version) >= parse("3.0.0")
            ):
                return system.version
        except ConnectionErrorException as exception:
            error: dict = exception.args[0]
            if error is not None and error["status"] == 404:
                return None
            raise
        return None
