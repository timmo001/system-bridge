"""System Bridge: Modules Listeners"""

import asyncio
from collections.abc import Awaitable, Callable

from systembridgeshared.base import Base
from systembridgeshared.const import MODEL_MAP
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.models.data import DataDict


class Listener:
    """Listener"""

    def __init__(
        self,
        listener_id: str,
        data_changed_callback: Callable[[str, DataDict], Awaitable[None]],
        modules: list[str],  # pylint: disable=unsubscriptable-object
    ) -> None:
        """Initialize"""
        self.id = listener_id
        self.data_changed_callback = data_changed_callback
        self.modules = modules


class Listeners(Base):
    """Module Listeners"""

    def __init__(
        self,
        database: Database,
        implemented_modules: list[str],  # pylint: disable=unsubscriptable-object
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database: Database = database
        self._implemented_modules: list[str] = implemented_modules
        self._data: dict = {module: {} for module in self._implemented_modules}
        # pylint: disable=unsubscriptable-object
        self._registered_listeners: list[Listener] = []

    async def add_listener(
        self,
        listener_id: str,
        data_changed_callback: Callable[[str, DataDict], Awaitable[None]],
        modules: list[str],  # pylint: disable=unsubscriptable-object
    ) -> bool:
        """Add modules to listener"""
        for listner in self._registered_listeners:
            if listner.id == listener_id:
                self._logger.warning("Listener already registered: %s", listener_id)
                return True

        self._registered_listeners.append(
            Listener(listener_id, data_changed_callback, modules)
        )
        self._logger.info("Added listener: %s", listener_id)

        await self.refresh_data()
        return False

    async def refresh_data(self) -> None:
        """Refresh data"""
        # Get modules from registered listeners
        modules = []
        for listener in self._registered_listeners:
            for module in listener.modules:
                if module not in modules:
                    modules.append(module)

        self._logger.info("Refresh data: %s", modules)

        # Refresh data for each module
        tasks = [self.refresh_data_by_module(module) for module in modules]
        await asyncio.gather(*tasks)

        self._logger.info("Finished refreshing data: %s", modules)

    async def refresh_data_by_module(
        self,
        module: str,
    ) -> None:
        """Refresh data by module"""
        self._logger.info("Refresh data by module: %s", module)
        if module not in self._implemented_modules:
            self._logger.warning("Module to refresh not implemented: %s", module)
            return

        if (model := MODEL_MAP.get(module)) is None:
            self._logger.warning("Unknown model: %s", module)
            return

        new_data = self._database.get_data_dict(TABLE_MAP[module])
        if new_data is None:
            self._logger.warning("No data found for module: %s", module)
            return

        if new_data != self._data[module]:
            self._logger.info("Data changed for module: %s", module)
            self._data[module] = model(**new_data.dict())
            for listener in self._registered_listeners:
                self._logger.info("Listener: %s - %s", listener.id, listener.modules)
                if module in listener.modules:
                    self._logger.info(
                        "Sending '%s' data to listener: %s", module, listener.id
                    )
                    await listener.data_changed_callback(module, new_data)

    def remove_all_listeners(self) -> None:
        """Remove all listeners"""
        self._registered_listeners.clear()

    def remove_listener(
        self,
        listener_id: str,
    ) -> bool:
        """Remove listener"""
        for listener in self._registered_listeners:
            if listener.id == listener_id:
                self._registered_listeners.remove(listener)
                self._logger.info("Removed listener: %s", listener_id)
                return True

        self._logger.info("Listener not found: %s", listener_id)
        return False
