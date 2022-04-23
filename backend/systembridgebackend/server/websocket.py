"""System Bridge: WebSocket handler"""
from json import JSONDecodeError, dumps, loads
from uuid import uuid4

from systembridgeshared.base import Base
from systembridgeshared.const import (
    TYPE_DATA_GET,
    TYPE_DATA_LISTENER_REGISTERED,
    TYPE_DATA_LISTENER_UNREGISTERED,
    TYPE_DATA_UPDATE,
    TYPE_ERROR,
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
    TYPE_GET_SETTING,
    TYPE_GET_SETTINGS,
    TYPE_REGISTER_DATA_LISTENER,
    TYPE_SETTING_RESULT,
    TYPE_SETTING_UPDATED,
    TYPE_SETTINGS_RESULT,
    TYPE_UNREGISTER_DATA_LISTENER,
    TYPE_UPDATE_SETTING,
)
from systembridgeshared.database import Database
from systembridgeshared.settings import SECRET_API_KEY, Settings

from systembridgebackend.modules.listeners import Listeners


class WebSocketHandler(Base):
    """WebSocket handler"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
        listeners: Listeners,
        implemented_modules: list[str],  # pylint: disable=unsubscriptable-object
        websocket,
        callback_exit_application: callable,
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
                dumps({"type": TYPE_ERROR, "message": "No api-key provided"})
            )
            return False
        if data["api-key"] != self._settings.get_secret(SECRET_API_KEY):
            self._logger.warning("Invalid api-key")
            await self._websocket.send(
                dumps({"type": TYPE_ERROR, "message": "Invalid api-key"})
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
                    "type": TYPE_DATA_UPDATE,
                    "message": "Data changed",
                    "module": module,
                    "data": data,
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
                        dumps({"type": TYPE_ERROR, "message": "Invalid JSON"})
                    )
                    continue

                self._logger.info("Received: %s", data["event"])

                if data["event"] == TYPE_EXIT_APPLICATION:
                    if not await self._check_api_key(data):
                        continue
                    self._callback_exit_application()
                    self._logger.info("Exit application called")
                    break
                elif data["event"] == TYPE_REGISTER_DATA_LISTENER:
                    if not await self._check_api_key(data):
                        continue
                    if "modules" not in data:
                        self._logger.warning("No modules provided")
                        await self._websocket.send(
                            dumps(
                                {"type": TYPE_ERROR, "message": "No modules provided"}
                            )
                        )
                        continue

                    self._logger.info(
                        "Registering data listener: %s - %s",
                        listener_id,
                        data["modules"],
                    )

                    if await self._listeners.add_listener(
                        listener_id,
                        self._data_changed,
                        data["modules"],
                    ):
                        await self._websocket.send(
                            dumps(
                                {
                                    "type": TYPE_ERROR,
                                    "message": "Listener already registered with this connection",
                                    "id": listener_id,
                                    "modules": data["modules"],
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_DATA_LISTENER_REGISTERED,
                                "message": "Data listener registered",
                                "id": listener_id,
                                "modules": data["modules"],
                            }
                        )
                    )
                elif data["event"] == TYPE_UNREGISTER_DATA_LISTENER:
                    if not await self._check_api_key(data):
                        continue

                    self._logger.info("Unregistering data listener %s", listener_id)

                    if not self._listeners.remove_listener(listener_id):
                        await self._websocket.send(
                            dumps(
                                {
                                    "type": TYPE_ERROR,
                                    "message": "Listener not registered with this connection",
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_DATA_LISTENER_UNREGISTERED,
                                "message": "Data listener unregistered",
                                "id": listener_id,
                            }
                        )
                    )
                elif data["event"] == TYPE_GET_DATA:
                    if not await self._check_api_key(data):
                        continue
                    if "modules" not in data:
                        self._logger.warning("No modules provided")
                        await self._websocket.send(
                            dumps(
                                {"type": TYPE_ERROR, "message": "No modules provided"}
                            )
                        )
                        continue
                    self._logger.info("Getting data: %s", data["modules"])

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_DATA_GET,
                                "message": "Getting data",
                                "modules": data["modules"],
                            }
                        )
                    )

                    for module in data["modules"]:
                        data = self._database.table_data_to_ordered_dict(module)
                        await self._websocket.send(
                            dumps(
                                {
                                    "type": TYPE_DATA_UPDATE,
                                    "message": "Data received",
                                    "module": module,
                                    "data": data,
                                }
                            )
                        )
                elif data["event"] == TYPE_GET_SETTINGS:
                    if not await self._check_api_key(data):
                        continue
                    self._logger.info("Getting settings")

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_SETTINGS_RESULT,
                                "message": "Got settings",
                                "data": self._settings.get_all(),
                            }
                        )
                    )

                elif data["event"] == TYPE_GET_SETTING:
                    if not await self._check_api_key(data):
                        continue
                    if "setting" not in data:
                        self._logger.warning("No setting provided")
                        await self._websocket.send(
                            dumps(
                                {"type": TYPE_ERROR, "message": "No setting provided"}
                            )
                        )
                        continue
                    self._logger.info("Getting setting: %s", data["setting"])

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_SETTING_RESULT,
                                "message": "Got setting",
                                "setting": data["setting"],
                                "data": self._settings.get(data["setting"]),
                            }
                        )
                    )
                elif data["event"] == TYPE_UPDATE_SETTING:
                    if not await self._check_api_key(data):
                        continue
                    if "setting" not in data:
                        self._logger.warning("No setting provided")
                        await self._websocket.send(
                            dumps(
                                {"type": TYPE_ERROR, "message": "No setting provided"}
                            )
                        )
                        continue
                    if "value" not in data:
                        self._logger.warning("No value provided")
                        await self._websocket.send(
                            dumps({"type": TYPE_ERROR, "message": "No value provided"})
                        )
                        continue
                    self._logger.info(
                        "Setting setting %s to: %s", data["setting"], data["value"]
                    )

                    self._settings.set(data["setting"], data["value"])

                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_SETTING_UPDATED,
                                "message": "Setting updated",
                                "setting": data["setting"],
                                "value": data["value"],
                            }
                        )
                    )
                else:
                    self._logger.warning("Unknown event: %s", data["event"])
                    await self._websocket.send(
                        dumps(
                            {
                                "type": TYPE_ERROR,
                                "message": "Unknown event",
                                "event": data["event"],
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
        self._active = active
