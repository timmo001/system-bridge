"""System Bridge: Action Utilities"""
from typing import Any

from systembridgeshared.base import Base
from systembridgeshared.const import SECRET_API_KEY, SETTING_PORT_API
from systembridgeshared.exceptions import (
    AuthenticationException,
    ConnectionErrorException,
)
from systembridgeshared.http_client import HTTPClient
from systembridgeshared.models.action import Action
from systembridgeshared.settings import Settings


class ActionHandler(Base):
    """Handle actions"""

    def __init__(
        self,
        settings: Settings,
    ) -> None:
        """Initialize the action handler"""
        super().__init__()
        self._settings = settings

    async def handle(
        self,
        action: Action,
    ) -> None:
        """Handle an action"""
        if action.command == "api" and action.data is not None:
            await self.api_action(action.data)
        else:
            self._logger.info("Unknown action: %s", action)

    async def api_action(
        self,
        data: dict[str, Any],
    ) -> None:
        """Handle an API action"""
        self._logger.info("API Action: %s", data)

        api_port = self._settings.get(SETTING_PORT_API)
        api_key = self._settings.get(SECRET_API_KEY)
        if api_port is None or api_key is None:
            self._logger.warning("API not configured")
            return
        client = HTTPClient(
            "localhost",
            int(str(api_port)),
            str(api_key),
        )
        try:
            await client.request(data["method"], data["url"], *data)
        except AuthenticationException as exception:
            self._logger.warning("API authentication error: %s", exception)
        except ConnectionErrorException as exception:
            self._logger.warning("API connection error: %s", exception)
