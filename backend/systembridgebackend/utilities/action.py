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
        self._logger.info("Action: %s", action.json())
        if action.command == "api" and action.data is not None:
            await self.api_action(action.data)
        else:
            self._logger.info("Unknown action: %s", action)

    async def api_action(
        self,
        data: dict[str, Any],
    ) -> Any:
        """Handle an API action"""
        self._logger.info("API Action: %s", data)

        api_port = self._settings.get(SETTING_PORT_API)
        api_key = self._settings.get_secret(SECRET_API_KEY)
        if api_port is None or api_key is None:
            self._logger.warning("API not configured")
            return

        http_client = HTTPClient(
            "localhost",
            int(str(api_port)),
            str(api_key),
        )
        method = str(data["method"]).upper()
        try:
            if method == "DELETE":
                return await http_client.delete(
                    f"/api/{data['endpoint']}",
                    data.get("body"),
                )
            if method == "GET":
                return await http_client.get(f"/api/{data['endpoint']}")
            if method == "POST":
                return await http_client.post(
                    f"/api/{data['endpoint']}",
                    data.get("body"),
                )
            if method == "PUT":
                return await http_client.put(
                    f"/api/{data['endpoint']}",
                    data.get("body"),
                )
            self._logger.warning("Unknown API method: %s", method)
            return None
        except AuthenticationException as exception:
            self._logger.warning("API authentication error: %s", exception)
        except ConnectionErrorException as exception:
            self._logger.warning("API connection error: %s", exception)
