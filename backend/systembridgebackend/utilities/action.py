"""System Bridge: Action Utilities"""
from typing import Any

from systembridgeshared.base import Base
from systembridgeshared.models.action import Action


class ActionHandler(Base):
    """Handle actions"""

    def handle(
        self,
        action: Action,
    ) -> None:
        """Handle an action"""
        if action.command == "api" and action.data is not None:
            self.api_action(action.data)
        else:
            self._logger.info("Unknown action: %s", action)

    def api_action(
        self,
        data: dict[str, Any],
    ) -> None:
        """Handle an API action"""
        self._logger.info("API Action: %s", data)
