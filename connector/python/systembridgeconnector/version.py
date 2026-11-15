"""Version."""

import re

from aiohttp import ClientSession

from .base import Base
from .exceptions import ConnectionErrorException
from .http_client import HTTPClient

# The first version where each client signs in with its own key
SUPPORTED_VERSION = "5.28.6"
_SUPPORTED_RELEASE = (5, 28, 6)

_RELEASE = re.compile(r"^(\d+(?:\.\d+)*)")


def release_of(version: str) -> tuple[int, ...] | None:
    """Return a version's release numbers, such as (5, 28, 6).

    Development builds report their version in more than one form, such as
    5.28.6.r7536.g323f78f or 5.28.6.dev7536+g323f78f, and both start with it.
    """
    if (match := _RELEASE.match(version)) is None:
        return None
    return tuple(int(part) for part in match.group(1).split("."))


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
        """Check if the system is running a supported version.

        Only the release numbers count, so development builds of a supported
        version are supported too.
        """
        if (version := await self.check_version()) is None or (
            release := release_of(version)
        ) is None:
            return False
        return release >= _SUPPORTED_RELEASE

    async def check_version(self) -> str | None:
        """Check the system version.

        It's read from the health route, which needs no key, so an older
        System Bridge that can't take a key still says which version it is.
        """
        try:
            response = await self._http_client.get_health()
        except ConnectionErrorException as exception:
            error: dict = exception.args[0]
            if error is not None and error["status"] == 404:
                return None
            raise
        if isinstance(response, dict) and (version := response.get("version")):
            return version
        return None
