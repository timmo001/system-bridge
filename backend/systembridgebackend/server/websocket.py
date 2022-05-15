"""System Bridge: WebSocket handler"""
from collections.abc import Callable
from json import JSONDecodeError, dumps, loads
from uuid import uuid4

from systembridgeshared.base import Base
from systembridgeshared.const import (
    EVENT_DATA,
    EVENT_EVENT,
    EVENT_ID,
    EVENT_MESSAGE,
    EVENT_MODULE,
    EVENT_MODULES,
    EVENT_SETTING,
    EVENT_SUBTYPE,
    EVENT_TYPE,
    EVENT_VALUE,
    SETTING_AUTOSTART,
    SUBTYPE_BAD_API_KEY,
    SUBTYPE_BAD_JSON,
    SUBTYPE_LISTENER_ALREADY_REGISTERED,
    SUBTYPE_LISTENER_NOT_REGISTERED,
    SUBTYPE_MISSING_API_KEY,
    SUBTYPE_MISSING_KEY,
    SUBTYPE_MISSING_MODULES,
    SUBTYPE_MISSING_PATH_URL,
    SUBTYPE_MISSING_SETTING,
    SUBTYPE_MISSING_TEXT,
    SUBTYPE_MISSING_VALUE,
    SUBTYPE_UNKNOWN_EVENT,
    TYPE_DATA_GET,
    TYPE_DATA_LISTENER_REGISTERED,
    TYPE_DATA_LISTENER_UNREGISTERED,
    TYPE_DATA_UPDATE,
    TYPE_ERROR,
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
    TYPE_GET_SETTING,
    TYPE_GET_SETTINGS,
    TYPE_KEYBOARD_KEY_PRESSED,
    TYPE_KEYBOARD_KEYPRESS,
    TYPE_KEYBOARD_TEXT,
    TYPE_KEYBOARD_TEXT_SENT,
    TYPE_OPEN,
    TYPE_OPENED,
    TYPE_REGISTER_DATA_LISTENER,
    TYPE_SETTING_RESULT,
    TYPE_SETTING_UPDATED,
    TYPE_SETTINGS_RESULT,
    TYPE_UNREGISTER_DATA_LISTENER,
    TYPE_UPDATE_SETTING,
)
from systembridgeshared.database import Database
from systembridgeshared.settings import SECRET_API_KEY, Settings

from systembridgebackend.autostart import autostart_disable, autostart_enable
from systembridgebackend.modules.listeners import Listeners
from systembridgebackend.server.keyboard import keyboard_keypress, keyboard_text
from systembridgebackend.server.open import open_path, open_url


class WebSocketHandler(Base):
    """WebSocket handler"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
        listeners: Listeners,
        implemented_modules: list[str],  # pylint: disable=unsubscriptable-object
        websocket,
        callback_exit_application: Callable,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._settings = settings
        self._listeners = listeners
        self._implemented_modules = implemented_modules
        self._websocket = websocket
        self._callback_exit_application = callback_exit_application
        self._active = True

    async def _check_api_key(
        self,
        data: dict,
    ) -> bool:
        """Check API key"""
        if "api-key" not in data:
            self._logger.warning("No api-key provided")
            await self._websocket.send(
                dumps(
                    {
                        EVENT_TYPE: TYPE_ERROR,
                        EVENT_SUBTYPE: SUBTYPE_MISSING_API_KEY,
                        EVENT_MESSAGE: "No api-key provided",
                    }
                )
            )
            return False
        if data["api-key"] != self._settings.get_secret(SECRET_API_KEY):
            self._logger.warning("Invalid api-key")
            await self._websocket.send(
                dumps(
                    {
                        EVENT_TYPE: TYPE_ERROR,
                        EVENT_SUBTYPE: SUBTYPE_BAD_API_KEY,
                        EVENT_MESSAGE: "Invalid api-key",
                    }
                )
            )
            return False
        return True

    async def _data_changed(
        self,
        module: str,
        data: dict,
    ) -> None:
        """Data changed"""
        if module not in self._implemented_modules:
            self._logger.info("Data module %s not in registered modules", module)
            return
        await self._websocket.send(
            dumps(
                {
                    EVENT_TYPE: TYPE_DATA_UPDATE,
                    EVENT_MESSAGE: "Data changed",
                    EVENT_MODULE: module,
                    EVENT_DATA: data,
                }
            )
        )

    async def handler(self) -> None:
        """Handler"""
        listener_id = str(uuid4())
        try:
            # Loop until the connection is closed
            while self._active:
                try:
                    data = loads(await self._websocket.recv())
                except JSONDecodeError as error:
                    self._logger.error("Invalid JSON: %s", error)
                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_ERROR,
                                EVENT_SUBTYPE: SUBTYPE_BAD_JSON,
                                EVENT_MESSAGE: "Invalid JSON",
                            }
                        )
                    )
                    continue

                self._logger.info("Received: %s", data[EVENT_EVENT])

                if data[EVENT_EVENT] == TYPE_EXIT_APPLICATION:
                    if not await self._check_api_key(data):
                        continue
                    self._callback_exit_application()
                    self._logger.info("Exit application called")
                elif data[EVENT_EVENT] == TYPE_KEYBOARD_KEYPRESS:
                    if not await self._check_api_key(data):
                        continue
                    if "key" not in data:
                        self._logger.warning("No key provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_KEY,
                                    EVENT_MESSAGE: "No key provided",
                                }
                            )
                        )
                        continue

                    try:
                        keyboard_keypress(data["key"])
                    except ValueError as err:
                        self._logger.warning(err.args[0])
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_KEY,
                                    EVENT_MESSAGE: "Invalid key",
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_KEYBOARD_KEY_PRESSED,
                                EVENT_MESSAGE: "Key pressed",
                                EVENT_ID: listener_id,
                                "key": data["key"],
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_KEYBOARD_TEXT:
                    if not await self._check_api_key(data):
                        continue
                    if "text" not in data:
                        self._logger.warning("No text provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_TEXT,
                                    EVENT_MESSAGE: "No text provided",
                                }
                            )
                        )
                        continue

                    keyboard_text(data["text"])

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_KEYBOARD_TEXT_SENT,
                                EVENT_MESSAGE: "Key pressed",
                                EVENT_ID: listener_id,
                                "text": data["text"],
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_OPEN:
                    if not await self._check_api_key(data):
                        continue
                    if "path" in data:
                        open_path(data["path"])
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_OPENED,
                                    EVENT_MESSAGE: "Path opened",
                                    EVENT_ID: listener_id,
                                    "path": data["path"],
                                }
                            )
                        )
                        continue
                    if "url" in data:
                        open_url(data["url"])
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_OPENED,
                                    EVENT_MESSAGE: "URL opened",
                                    EVENT_ID: listener_id,
                                    "url": data["url"],
                                }
                            )
                        )
                        continue

                    self._logger.warning("No path or url provided")
                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_ERROR,
                                EVENT_SUBTYPE: SUBTYPE_MISSING_PATH_URL,
                                EVENT_MESSAGE: "No path or url provided",
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_REGISTER_DATA_LISTENER:
                    if not await self._check_api_key(data):
                        continue
                    if EVENT_MODULES not in data:
                        self._logger.warning("No modules provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_MODULES,
                                    EVENT_MESSAGE: "No modules provided",
                                }
                            )
                        )
                        continue

                    self._logger.info(
                        "Registering data listener: %s - %s",
                        listener_id,
                        data[EVENT_MODULES],
                    )

                    if await self._listeners.add_listener(
                        listener_id,
                        self._data_changed,
                        data[EVENT_MODULES],
                    ):
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_LISTENER_ALREADY_REGISTERED,
                                    EVENT_MESSAGE: "Listener already registered with this connection",
                                    EVENT_ID: listener_id,
                                    EVENT_MODULES: data[EVENT_MODULES],
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_DATA_LISTENER_REGISTERED,
                                EVENT_MESSAGE: "Data listener registered",
                                EVENT_ID: listener_id,
                                EVENT_MODULES: data[EVENT_MODULES],
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_UNREGISTER_DATA_LISTENER:
                    if not await self._check_api_key(data):
                        continue

                    self._logger.info("Unregistering data listener %s", listener_id)

                    if not self._listeners.remove_listener(listener_id):
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_LISTENER_NOT_REGISTERED,
                                    EVENT_MESSAGE: "Listener not registered with this connection",
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_DATA_LISTENER_UNREGISTERED,
                                EVENT_MESSAGE: "Data listener unregistered",
                                EVENT_ID: listener_id,
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_GET_DATA:
                    if not await self._check_api_key(data):
                        continue
                    if EVENT_MODULES not in data:
                        self._logger.warning("No modules provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_MODULES,
                                    EVENT_MESSAGE: "No modules provided",
                                }
                            )
                        )
                        continue
                    self._logger.info("Getting data: %s", data[EVENT_MODULES])

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_DATA_GET,
                                EVENT_MESSAGE: "Getting data",
                                EVENT_MODULES: data[EVENT_MODULES],
                            }
                        )
                    )

                    for module in data[EVENT_MODULES]:
                        data = self._database.table_data_to_ordered_dict(module)
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_DATA_UPDATE,
                                    EVENT_MESSAGE: "Data received",
                                    EVENT_MODULE: module,
                                    EVENT_DATA: data,
                                }
                            )
                        )
                elif data[EVENT_EVENT] == TYPE_GET_SETTINGS:
                    if not await self._check_api_key(data):
                        continue
                    self._logger.info("Getting settings")

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_SETTINGS_RESULT,
                                EVENT_MESSAGE: "Got settings",
                                EVENT_DATA: self._settings.get_all(),
                            }
                        )
                    )

                elif data[EVENT_EVENT] == TYPE_GET_SETTING:
                    if not await self._check_api_key(data):
                        continue
                    if EVENT_SETTING not in data:
                        self._logger.warning("No setting provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_SETTING,
                                    EVENT_MESSAGE: "No setting provided",
                                }
                            )
                        )
                        continue
                    self._logger.info("Getting setting: %s", data[EVENT_SETTING])

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_SETTING_RESULT,
                                EVENT_MESSAGE: "Got setting",
                                EVENT_SETTING: data[EVENT_SETTING],
                                EVENT_DATA: self._settings.get(data[EVENT_SETTING]),
                            }
                        )
                    )
                elif data[EVENT_EVENT] == TYPE_UPDATE_SETTING:
                    if not await self._check_api_key(data):
                        continue
                    if EVENT_SETTING not in data:
                        self._logger.warning("No setting provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_SETTING,
                                    EVENT_MESSAGE: "No setting provided",
                                }
                            )
                        )
                        continue
                    if EVENT_VALUE not in data:
                        self._logger.warning("No value provided")
                        await self._websocket.send(
                            dumps(
                                {
                                    EVENT_TYPE: TYPE_ERROR,
                                    EVENT_SUBTYPE: SUBTYPE_MISSING_VALUE,
                                    EVENT_MESSAGE: "No value provided",
                                }
                            )
                        )
                        continue
                    self._logger.info(
                        "Setting setting %s to: %s",
                        data[EVENT_SETTING],
                        data[EVENT_VALUE],
                    )

                    self._settings.set(data[EVENT_SETTING], data[EVENT_VALUE])

                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_SETTING_UPDATED,
                                EVENT_MESSAGE: "Setting updated",
                                EVENT_SETTING: data[EVENT_SETTING],
                                EVENT_VALUE: data[EVENT_VALUE],
                            }
                        )
                    )

                    if data[EVENT_SETTING] != SETTING_AUTOSTART:
                        continue
                    self._logger.info("Setting autostart to %s", data[EVENT_VALUE])
                    if data[EVENT_VALUE]:
                        autostart_enable()
                    else:
                        autostart_disable()
                else:
                    self._logger.warning("Unknown event: %s", data[EVENT_EVENT])
                    await self._websocket.send(
                        dumps(
                            {
                                EVENT_TYPE: TYPE_ERROR,
                                EVENT_SUBTYPE: SUBTYPE_UNKNOWN_EVENT,
                                EVENT_MESSAGE: "Unknown event",
                                EVENT_EVENT: data[EVENT_EVENT],
                            }
                        )
                    )
        except ConnectionError as error:
            self._logger.info("Connection closed: %s", error)
        finally:
            self._logger.info("Unregistering data listener %s", listener_id)
            self._listeners.remove_listener(listener_id)

    def set_active(
        self,
        active: bool,
    ) -> None:
        """Set active"""
        self._active = active
