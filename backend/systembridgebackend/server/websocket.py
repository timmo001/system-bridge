from json import JSONDecodeError, dumps, loads
from uuid import uuid4

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.modules.listeners import Listeners
from systembridgebackend.settings import Settings, SECRET_API_KEY


class WebSocket(Base):
    def __init__(
        self,
        database: Database,
        settings: Settings,
        listeners: Listeners,
        implemented_modules: list[str],
        websocket,
    ) -> None:
        super().__init__()
        self._database = database
        self._settings = settings
        self._listeners = listeners
        self._implemented_modules = implemented_modules
        self._websocket = websocket

    async def _check_api_key(
        self,
        data: dict,
    ) -> bool:
        """Check API key"""
        if "api-key" not in data:
            self._self._logger.warn("No api-key provided")
            await self._websocket.send(
                dumps({"type": "ERROR", "message": "No api-key provided"})
            )
            return False
        if data["api-key"] != self._settings.get_secret(SECRET_API_KEY):
            self._logger.warn("Invalid api-key")
            await self._websocket.send(
                dumps({"type": "ERROR", "message": "Invalid api-key"})
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
                    "type": "DATA_UPDATE",
                    "message": "Data changed",
                    "module": module,
                    "data": data,
                }
            )
        )

    async def handler(self) -> None:
        """Handler"""
        id = str(uuid4())
        try:
            # Loop until the connection is closed
            while True:
                try:
                    data = loads(await self._websocket.recv())
                except JSONDecodeError as e:
                    self._logger.error("Invalid JSON: %s", e)
                    await self._websocket.send(
                        dumps({"type": "ERROR", "message": "Invalid JSON"})
                    )
                    continue

                self._logger.info("Received data: %s", data)
                if data["event"] == "register-data-listener":
                    if not await self._check_api_key(data):
                        continue
                    if "modules" not in data:
                        self._logger.warn("No modules provided")
                        await self._websocket.send(
                            dumps({"type": "ERROR", "message": "No modules provided"})
                        )
                        continue

                    self._logger.info(
                        "Registering data listener: %s - %s", id, data["modules"]
                    )

                    if await self._listeners.add_listener(
                        id,
                        self._data_changed,
                        data["modules"],
                    ):
                        await self._websocket.send(
                            dumps(
                                {
                                    "type": "ERROR",
                                    "message": "Listener already registered with this connection",
                                    "id": id,
                                    "modules": data["modules"],
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                "type": "DATA_LISTENER_REGISTERED",
                                "message": "Data listener registered",
                                "id": id,
                                "modules": data["modules"],
                            }
                        )
                    )
                elif data["event"] == "unregister-data-listener":
                    if not await self._check_api_key(data):
                        continue

                    self._logger.info("Unregistering data listener %s", id)

                    if not await self._listeners.remove_listener(id):
                        await self._websocket.send(
                            dumps(
                                {
                                    "type": "ERROR",
                                    "message": "Listener not registered with this connection",
                                }
                            )
                        )
                        continue

                    await self._websocket.send(
                        dumps(
                            {
                                "type": "DATA_LISTENER_UNREGISTERED",
                                "message": "Data listener unregistered",
                                "id": id,
                            }
                        )
                    )
                elif data["event"] == "get-data":
                    if not await self._check_api_key(data):
                        continue
                    if "modules" not in data:
                        self._logger.warn("No modules provided")
                        await self._websocket.send(
                            dumps({"type": "ERROR", "message": "No modules provided"})
                        )
                        continue
                    self._logger.info("Getting data: %s", data["modules"])

                    await self._websocket.send(
                        dumps(
                            {
                                "type": "DATA_GET",
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
                                    "type": "DATA_UPDATE",
                                    "message": "Data received",
                                    "module": module,
                                    "data": data,
                                }
                            )
                        )

                else:
                    self._logger.warn("Unknown event: %s", data["event"])
                    await self._websocket.send(
                        dumps(
                            {
                                "type": "ERROR",
                                "message": "Unknown event",
                                "event": data["event"],
                            }
                        )
                    )
        except ConnectionError as e:
            self._logger.info("Connection closed: %s", e)
        finally:
            self._logger.info("Unregistering data listener %s", id)
            await self._listeners.remove_listener(id)
            await self._websocket.close()
