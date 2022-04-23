"""System Bridge: Module Listeners"""

import asyncio

from systembridgeshared.base import Base
from systembridgeshared.database import Database


class Listener:
    """Listener"""

    def __init__(
        self,
        listener_id: str,
        data_changed_callback: callable,
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
        self._database = database
        self._implemented_modules = implemented_modules
        self._data = {module: {} for module in self._implemented_modules}
        # pylint: disable=unsubscriptable-object
        self._registered_listeners: list[Listener] = []

    async def add_listener(
        self,
        listener_id: str,
        data_changed_callback: callable,
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
        if not self._database.connected:
            self._database.connect()

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

        new_data = self._database.table_data_to_ordered_dict(module)
        if new_data and new_data != self._data[module]:
            self._logger.info("Data changed for module: %s", module)
            self._data[module] = new_data
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
                self._logger.info(
                    "Registered listeners: %s", self._registered_listeners
                )
                return True

        self._logger.warning("Listener not found: %s", listener_id)
        return False
