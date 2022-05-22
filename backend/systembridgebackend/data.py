"""System Bridge: Data"""
import asyncio
from collections.abc import Callable
from threading import Thread

from systembridgeshared.base import Base
from systembridgeshared.database import Database

from systembridgebackend.modules.update import Update


class UpdateThread(Thread):
    """Update thread"""

    def __init__(
        self,
        database: Database,
        updated_callback: Callable,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._update = Update(self._database)
        self._updated_callback = updated_callback

    def run(self) -> None:
        """Run"""
        asyncio.run(self._update.update_data(self._updated_callback))


class UpdateFrequentThread(Thread):
    """Update frequent thread"""

    def __init__(
        self,
        database: Database,
        updated_callback: Callable,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._update = Update(self._database)
        self._updated_callback = updated_callback

    def run(self) -> None:
        """Run"""
        asyncio.run(self._update.update_frequent_data(self._updated_callback))


class Data(Base):
    """Data"""

    def __init__(
        self,
        database: Database,
        updated_callback: Callable,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._updated_callback = updated_callback

    def request_update_data(self) -> None:
        """Request update data"""
        thread = UpdateThread(
            self._database,
            self._updated_callback,
        )
        thread.start()

    def request_update_frequent_data(self) -> None:
        """Request update frequent data"""
        thread = UpdateFrequentThread(
            self._database,
            self._updated_callback,
        )
        thread.start()
