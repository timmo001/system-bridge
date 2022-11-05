"""System Bridge: Server"""
import asyncio
import sys
from typing import Optional

import uvicorn
from rocketry import Rocketry
from rocketry.conds import every
from systembridgeshared.base import Base
from systembridgeshared.database import Database
from systembridgeshared.settings import Settings

from .._version import __version__
from ..data import Data
from ..gui import GUI, GUIAttemptsExceededException
from ..modules.listeners import Listeners
from ..server.mdns import MDNSAdvertisement
from .api import app as api_app


class APIServer(uvicorn.Server):
    """Customized uvicorn.Server

    Uvicorn server overrides signals and we need to include
    Rocketry to the signals."""

    def handle_exit(self, sig: int, frame) -> None:
        # app_rocketry.session.shut_down()
        return super().handle_exit(sig, frame)


class Server(Base):
    """Server"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
        listeners: Listeners,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._gui_notification: Optional[GUI] = None
        self._gui_player: Optional[GUI] = None
        self._gui: Optional[GUI] = None
        self._listeners = listeners
        self._settings = settings

        self._mdns_advertisement = MDNSAdvertisement(settings)
        self._mdns_advertisement.advertise_server()

        self._api_server = APIServer(
            config=uvicorn.Config(api_app, workers=1, loop="asyncio")
        )
        self._data = Data(database, self.callback_data_updated)
        self._scheduler = Rocketry(execution="async")
        self._scheduler.task(self.update_data, every("2 minutes"))
        self._scheduler.task(self.update_frequent_data, every("30 seconds"))

    async def start(self) -> None:
        """Start the server"""
        self._logger.info("System Bridge %s: Server", __version__.public())
        # self._scheduler.run()
        asyncio.create_task(self._api_server.serve())
        asyncio.create_task(self._scheduler.serve())
        if "--no-gui" not in sys.argv:
            gui = GUI(self._settings)
            try:
                gui.start()
            except GUIAttemptsExceededException:
                self._logger.error("GUI could not be started. Exiting application")
                self.exit_application()

    async def callback_data_updated(
        self,
        module: str,
    ) -> None:
        """Data updated"""
        await self._listeners.refresh_data_by_module(module)

    def exit_application(self) -> None:
        """Exit application"""
        self._logger.info("Exiting application")
        sys.exit(0)

    # @scheduler.task(every("2 minutes"))
    async def update_data(self) -> None:
        """Update data"""
        self._data.request_update_data()

    # @scheduler.task(every("30 seconds"))
    async def update_frequent_data(self) -> None:
        """Update frequent data"""
        self._data.request_update_frequent_data()
