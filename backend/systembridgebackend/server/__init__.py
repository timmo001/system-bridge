"""System Bridge: Server"""
import asyncio
import sys
from collections.abc import Callable
from json import loads
from typing import Optional

import uvicorn
from systembridgeshared.base import Base
from systembridgeshared.const import (
    SETTING_KEYBOARD_HOTKEYS,
    SETTING_LOG_LEVEL,
    SETTING_PORT_API,
)
from systembridgeshared.database import Database
from systembridgeshared.models.action import Action
from systembridgeshared.settings import Settings

from ..data import Data
from ..gui import GUI
from ..modules.listeners import Listeners
from ..server.mdns import MDNSAdvertisement
from ..utilities.action import ActionHandler
from ..utilities.keyboard import (
    keyboard_hotkey_register,
    keyboard_hotkey_unregister_all,
)
from .api import app as api_app


class APIServer(uvicorn.Server):
    """Customized uvicorn.Server

    Uvicorn server overrides signals and we need to include
    Tasks to the signals."""

    def __init__(
        self,
        config: uvicorn.Config,
        exit_callback: Callable[[], None],
    ) -> None:
        super().__init__(config)
        self._exit_callback = exit_callback

    def handle_exit(self, sig: int, frame) -> None:
        """Handle exit."""
        self._exit_callback()
        return super().handle_exit(sig, frame)


class Server(Base):
    """Server"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
        listeners: Listeners,
        implemented_modules: list[str],
    ) -> None:
        """Initialize"""
        super().__init__()
        self._gui_notification: Optional[GUI] = None
        self._gui_player: Optional[GUI] = None
        self._gui: Optional[GUI] = None
        self._listeners = listeners
        self._settings = settings
        self._tasks: list[asyncio.Task] = []

        self._mdns_advertisement = MDNSAdvertisement(settings)
        self._mdns_advertisement.advertise_server()

        self._logger.info("Setup API app")
        api_app.callback_exit = self.exit_application
        api_app.callback_open_gui = self.callback_open_gui
        api_app.listeners = listeners
        api_app.implemented_modules = implemented_modules
        api_app.loop = asyncio.get_event_loop()

        self._logger.info("Setup API server")
        self._api_server = APIServer(
            config=uvicorn.Config(
                api_app,
                host="0.0.0.0",
                loop="asyncio",
                log_config=None,
                log_level=str(settings.get(SETTING_LOG_LEVEL)).lower(),
                port=int(str(settings.get(SETTING_PORT_API))),
                workers=4,
            ),
            exit_callback=self.exit_application,
        )
        self._data = Data(database, self.callback_data_updated)
        self._logger.info("Server initialized")

    async def start(self) -> None:
        """Start the server"""
        self._logger.info("Start server")
        self._tasks.extend(
            [
                api_app.loop.create_task(
                    self._api_server.serve(),
                    name="API",
                ),
                api_app.loop.create_task(
                    self.update_data(),
                    name="Update data",
                ),
                api_app.loop.create_task(
                    self.update_frequent_data(),
                    name="Update frequent data",
                ),
            ]
        )
        if "--no-gui" not in sys.argv:
            self._gui = GUI(self._settings)
            self._tasks.extend(
                [
                    api_app.loop.create_task(
                        self._gui.start(self.exit_application),
                        name="GUI",
                    ),
                    api_app.loop.create_task(
                        self.register_hotkeys(),
                        name="Register hotkeys",
                    ),
                ]
            )

        await asyncio.wait(self._tasks)

    async def callback_data_updated(
        self,
        module: str,
    ) -> None:
        """Data updated"""
        await self._listeners.refresh_data_by_module(module)

    def callback_open_gui(
        self,
        command: str,
        data: str,
    ) -> None:
        """Open GUI"""
        if command == "notification":
            if self._gui_notification:
                self._gui_notification.stop()
            self._gui_notification = GUI(self._settings)
            self._tasks.append(
                api_app.loop.create_task(
                    self._gui_notification.start(
                        self.exit_application,
                        command,
                        data,
                    ),
                    name="GUI Notification",
                )
            )
        elif command == "player":
            if self._gui_player:
                self._gui_player.stop()
            self._gui_player = GUI(self._settings)
            self._tasks.append(
                api_app.loop.create_task(
                    self._gui_player.start(
                        self.exit_application,
                        command,
                        data,
                    ),
                    name="GUI Media Player",
                )
            )

    def exit_application(self) -> None:
        """Exit application"""
        self._logger.info("Exiting application")
        for task in self._tasks:
            task.cancel()
        self._logger.info("Tasks cancelled")
        if self._gui:
            self._gui.stop()
        if self._gui_notification:
            self._gui_notification.stop()
        if self._gui_player:
            self._gui_player.stop()
        self._logger.info("GUI stopped. Exiting Application")
        sys.exit(0)

    async def register_hotkeys(self) -> None:
        """Register hotkeys"""
        self._logger.info("Register hotkeys")
        hotkeys = self._settings.get(SETTING_KEYBOARD_HOTKEYS)
        if hotkeys is not None and isinstance(hotkeys, list):
            self._logger.info("Found %s hotkeys", len(hotkeys))
            for item in hotkeys:
                self.register_hotkey(item)

    def register_hotkey(
        self,
        item: dict,
    ) -> None:
        """Register hotkey"""
        hotkey = item["name"]
        self._logger.info("Register hotkey '%s' to: %s", hotkey, item["value"])
        action = Action(**loads(item["value"]))

        def hotkey_callback() -> None:
            """Hotkey callback"""
            self._logger.info("Hotkey '%s' pressed", hotkey)
            action_handler = ActionHandler(self._settings)
            api_app.loop.create_task(action_handler.handle(action))

        keyboard_hotkey_register(
            hotkey,
            hotkey_callback,
        )

    async def update_data(self) -> None:
        """Update data"""
        self._logger.info("Update data")
        self._data.request_update_data()
        self._logger.info("Schedule next update in 2 minutes")
        await asyncio.sleep(120)
        await self.update_data()

    async def update_frequent_data(self) -> None:
        """Update frequent data"""
        self._logger.info("Update frequent data")
        self._data.request_update_frequent_data()
        self._logger.info("Schedule next frequent update in 30 seconds")
        await asyncio.sleep(30)
        await self.update_frequent_data()
