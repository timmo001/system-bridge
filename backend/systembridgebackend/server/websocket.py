from json import dumps, loads

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.settings import Settings, SECRET_API_KEY


class WebSocket(Base):
    def __init__(
        self,
        database: Database,
        settings: Settings,
        websocket,
    ) -> None:
        super().__init__()
        self._database = database
        self._settings = settings
        self._websocket = websocket

    async def _check_api_key(
        self,
        data: dict,
    ) -> bool:
        """Check API key"""
        if "api-key" not in data:
            self._self._logger.warn("No api-key provided")
            await self._websocket.send(
                dumps({"error": True, "message": "No api-key provided"})
            )
            return False
        if data["api-key"] != self._settings.get_secret(SECRET_API_KEY):
            self._logger.warn("Invalid api-key")
            await self._websocket.send(
                dumps({"error": True, "message": "Invalid api-key"})
            )
            return False
        return True

    async def handler(self) -> None:
        """Handler"""
        # Loop until the connection is closed
        while True:
            data = loads(await self._websocket.recv())
            self._logger.info("Received data: %s", data)
            if data["event"] == "register-data-listener":
                if not await self._check_api_key(data):
                    continue
                if "modules" not in data:
                    self._logger.warn("No modules provided")
                    await self._websocket.send(
                        dumps({"error": True, "message": "No modules provided"})
                    )
                    continue
                self._logger.info("Registering data listener: %s", data["modules"])
                await self._websocket.send(
                    dumps(
                        {
                            "error": False,
                            "message": "Data listener registered",
                            "modules": data["modules"],
                        }
                    )
                )
            elif data["event"] == "unregister-data-listener":
                if not await self._check_api_key(data):
                    continue
                if "modules" not in data:
                    self._logger.warn("No modules provided")
                    await self._websocket.send(
                        dumps({"error": True, "message": "No modules provided"})
                    )
                    continue
                self._logger.info("Unregistering data listener %s", data["modules"])
                await self._websocket.send(
                    dumps(
                        {
                            "error": False,
                            "message": "Data listener unregistered",
                            "modules": data["modules"],
                        }
                    )
                )
            elif data["event"] == "get-data":
                if not await self._check_api_key(data):
                    continue
                if "modules" not in data:
                    self._logger.warn("No modules provided")
                    await self._websocket.send(
                        dumps({"error": True, "message": "No modules provided"})
                    )
                    continue
                self._logger.info("Getting data: %s", data["modules"])
                await self._websocket.send(
                    dumps(
                        {
                            "error": False,
                            "message": "Getting data",
                            "modules": data["modules"],
                        }
                    )
                )
            else:
                self._logger.warn("Unknown event: %s", data["event"])
                await self._websocket.send(
                    dumps({"error": True, "message": "Unknown event"})
                )
