"""WebSocket Client."""

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import asdict
import socket
from typing import Any
from uuid import uuid4

import aiohttp

from .base import Base
from .const import MODEL_MAP, EventKey, EventSubType, EventType
from .exceptions import (
    AuthenticationException,
    BadMessageException,
    BadRequestException,
    ConnectionClosedException,
    ConnectionErrorException,
    DataMissingException,
)
from .models.command_execute import ExecuteRequest
from .models.command_result import ExecuteResult
from .models.discord_control import DiscordControl
from .models.keyboard_key import KeyboardKey
from .models.keyboard_text import KeyboardText
from .models.media_control import MediaControl
from .models.media_directories import MediaDirectory
from .models.media_files import FileInfo, MediaFile, MediaFiles
from .models.media_get_file import MediaGetFile
from .models.media_get_files import MediaGetFiles
from .models.modules import GetData, ModulesData, RegisterDataListener
from .models.modules.disks import DiskMounts
from .models.notification import Notification
from .models.open_path import OpenPath
from .models.open_url import OpenUrl
from .models.request import Request
from .models.response import Response
from .models.settings import Settings, SettingsCommandDefinition, SettingsCommands
from .models.update import Update


class WebSocketClient(Base):
    """WebSocket Client."""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        token: str,
        session: aiohttp.ClientSession,
        websocket: aiohttp.ClientWebSocketResponse | None = None,
        can_close_session: bool = False,
    ) -> None:
        """Initialise."""
        super().__init__()
        self._api_host = api_host
        self._api_port = api_port
        self._token = token
        self._responses: dict[str, tuple[asyncio.Future[Response], str | None]] = {}
        self._session = session
        self._websocket = websocket
        self._can_close_session = can_close_session

    @property
    def connected(self) -> bool:
        """Get connection state."""
        return self._websocket is not None and not self._websocket.closed

    async def close(self) -> None:
        """Close connection."""
        self._logger.info("Closing WebSocket connection")
        if self._websocket is not None:
            await self._websocket.close()
        if self._session is not None and self._can_close_session:
            await self._session.close()

    async def connect(self) -> None:
        """Connect to server."""
        url = f"ws://{self._api_host}:{self._api_port}/api/websocket"
        self._logger.info(
            "Connecting to WebSocket: %s (aiohttp: %s)",
            url,
            aiohttp.__version__,
        )
        try:
            self._websocket = await self._session.ws_connect(url=url, heartbeat=30)
        except (
            aiohttp.WSServerHandshakeError,
            aiohttp.ClientConnectionError,
            socket.gaierror,
        ) as error:
            self._logger.warning(
                "Failed to connect to WebSocket: %s - %s",
                error.__class__.__name__,
                error,
            )
            raise ConnectionErrorException(error) from error

    async def application_update(
        self,
        model: Update,
        request_id: str | None = None,
    ) -> Response:
        """Update application."""
        self._logger.info("Updating application")
        return await self.send_message(
            EventType.APPLICATION_UPDATE,
            request_id,
            asdict(model),
            wait_for_response=False,
        )

    async def exit_backend(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Exit backend."""
        self._logger.info("Exiting backend")
        return await self.send_message(
            EventType.EXIT_APPLICATION,
            request_id,
            {},
            wait_for_response=False,
        )

    async def get_data(
        self,
        model: GetData,
        request_id: str | None = None,
        timeout: int = 10,
    ) -> ModulesData:
        """Get data from server."""
        self._logger.info("Getting data from server: %s", model)

        modules_data = ModulesData()

        async def handle_module(
            module_name: str,
            module: Any,
        ) -> None:
            """Handle returned data."""
            self._logger.debug("Set new data for: %s", module_name)
            setattr(modules_data, module_name, module)

        listener_task = asyncio.create_task(
            self.listen(
                callback=handle_module,
                accept_other_types=False,
                name="Get data WebSocket Listener",
            ),
            name="Get data WebSocket Listener",
        )

        await self.send_message(
            EventType.GET_DATA,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.DATA_GET,
        )

        # Wait for all data modules to be set
        try:
            async with asyncio.timeout(timeout):
                while not all(
                    getattr(modules_data, module_name) is not None
                    for module_name in model.modules
                ):
                    await asyncio.sleep(0.1)
                    if listener_task.done():
                        break
        except TimeoutError as exception:
            modules_missing = [
                module_name
                for module_name in model.modules
                if getattr(modules_data, module_name) is None
            ]
            self._logger.error(
                "Timeout waiting for data after %s seconds. Modules missing: %s",
                timeout,
                modules_missing,
            )
            raise DataMissingException(
                f"Timeout waiting for data after {timeout} seconds. Modules missing: {modules_missing}"
            ) from exception
        finally:
            self._logger.debug("Cancelling listener task")
            if not listener_task.done():
                listener_task.cancel()

            # If the listener task threw an exception, raise it here
            if (
                listener_task.done()
                and (listener_exception := listener_task.exception()) is not None
            ):
                raise listener_exception

        return modules_data

    async def get_directories(
        self,
        request_id: str | None = None,
    ) -> list[MediaDirectory]:
        """Get directories.

        Transforms API response to match MediaDirectory model requirements.
        If the API response lacks a 'name' field, it is derived from the 'key'
        field by capitalizing the first letter.
        """
        self._logger.info("Getting directories..")
        response = await self.send_message(
            EventType.GET_DIRECTORIES,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.DIRECTORIES,
        )

        if response.data is None or not isinstance(response.data, list):
            return []

        directories = []
        for directory in response.data:
            # Transform API response to match MediaDirectory model
            # API returns 'key' and 'path', but model requires 'name'
            directory_data = {
                "key": directory.get("key", ""),
                "path": directory.get("path", ""),
                "description": directory.get("description"),
            }

            # Derive 'name' from 'key' if not provided by API
            if directory.get("name"):
                directory_data["name"] = directory["name"]
            elif directory_data["key"]:
                # Capitalize first letter of key
                directory_data["name"] = (
                    directory_data["key"][:1].capitalize() + directory_data["key"][1:]
                )
            else:
                # Fallback if key is empty
                directory_data["name"] = ""

            directories.append(MediaDirectory(**directory_data))

        return directories

    async def get_disk_mounts(
        self,
        request_id: str | None = None,
    ) -> DiskMounts:
        """Get disk mounts, grouped into primary and secondary mounts."""
        self._logger.info("Getting disk mounts")
        response = await self.send_message(
            EventType.GET_DISK_MOUNTS,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.DISK_MOUNTS,
        )

        return DiskMounts(**self._response_dict(response, "disk mounts"))

    async def get_directory(
        self,
        base: str,
        request_id: str | None = None,
    ) -> MediaDirectory:
        """Get a media directory by its key."""
        self._logger.info("Getting directory: %s", base)
        response = await self.send_message(
            EventType.GET_DIRECTORY,
            request_id,
            {"base": base},
            wait_for_response=True,
            response_type=EventType.DIRECTORY,
        )

        return MediaDirectory(**self._response_dict(response, "directory"))

    async def validate_directory(
        self,
        path: str,
        request_id: str | None = None,
    ) -> bool:
        """Check a path exists and is a directory."""
        self._logger.info("Validating directory: %s", path)
        response = await self.send_message(
            EventType.VALIDATE_DIRECTORY,
            request_id,
            {"path": path},
            wait_for_response=True,
            response_type=EventType.DIRECTORY_VALIDATED,
        )

        return self._response_dict(response, "validate directory").get("valid") is True

    async def get_settings(
        self,
        request_id: str | None = None,
    ) -> Settings:
        """Get settings."""
        self._logger.info("Getting settings")
        response = await self.send_message(
            EventType.GET_SETTINGS,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.SETTINGS_RESULT,
        )

        return Settings(**self._response_dict(response, "settings"))

    async def update_settings(
        self,
        model: Settings,
        request_id: str | None = None,
    ) -> Settings:
        """Update settings, returning the saved settings."""
        self._logger.info("Updating settings")
        response = await self.send_message(
            EventType.UPDATE_SETTINGS,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.SETTINGS_UPDATED,
        )

        return Settings(**self._response_dict(response, "update settings"))

    def _response_dict(self, response: Response, name: str) -> dict[str, Any]:
        """Return a response's data, raising on an error, timeout or bad data."""
        if response.type == EventType.ERROR:
            if response.subtype == "TIMEOUT":
                raise ConnectionErrorException(
                    response.message or f"Timeout waiting for {name} response"
                )
            raise BadRequestException(response.message or f"Failed to get {name}")

        if not isinstance(response.data, dict):
            raise TypeError(
                f"{name.capitalize()} response data must be a dict, got {type(response.data).__name__}"
            )

        return response.data

    async def get_files(
        self,
        model: MediaGetFiles,
        request_id: str | None = None,
    ) -> MediaFiles:
        """Get files."""
        self._logger.info("Getting files: %s", model)
        response = await self.send_message(
            EventType.GET_FILES,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.FILES,
        )

        return (
            MediaFiles(
                files=[MediaFile(**file) for file in response.data],
                path=model.path if model.path is not None else "",
            )
            if response.data is not None and isinstance(response.data, list)
            else MediaFiles(
                files=[],
                path=model.path if model.path is not None else "",
            )
        )

    async def get_file(
        self,
        model: MediaGetFile,
        request_id: str | None = None,
    ) -> FileInfo | None:
        """Get file info."""
        self._logger.info("Getting file: %s", model)
        response = await self.send_message(
            EventType.GET_FILE,
            request_id,
            {"path": model.path},
            wait_for_response=True,
            response_type=EventType.FILE,
        )

        return (
            FileInfo(**response.data)
            if response.type == EventType.FILE and isinstance(response.data, dict)
            else None
        )

    async def register_data_listener(
        self,
        model: RegisterDataListener,
        request_id: str | None = None,
    ) -> Response:
        """Register data listener."""
        self._logger.info("Registering data listener: %s", model)
        return await self.send_message(
            EventType.REGISTER_DATA_LISTENER,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.DATA_LISTENER_REGISTERED,
        )

    async def unregister_data_listener(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Unregister data listener."""
        self._logger.info("Unregistering data listener")
        return await self.send_message(
            EventType.UNREGISTER_DATA_LISTENER,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.DATA_LISTENER_UNREGISTERED,
        )

    async def keyboard_keypress(
        self,
        model: KeyboardKey,
        request_id: str | None = None,
    ) -> Response:
        """Keyboard keypress."""
        self._logger.info("Press key: %s", model)
        return await self.send_message(
            EventType.KEYBOARD_KEYPRESS,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.KEYBOARD_KEY_PRESSED,
        )

    async def keyboard_text(
        self,
        model: KeyboardText,
        request_id: str | None = None,
    ) -> Response:
        """Keyboard keypress."""
        self._logger.info("Enter text: %s", model)
        return await self.send_message(
            EventType.KEYBOARD_TEXT,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.KEYBOARD_TEXT_SENT,
        )

    async def media_control(
        self,
        model: MediaControl,
        request_id: str | None = None,
    ) -> Response:
        """Media control."""
        self._logger.info("Media control: %s", model)
        return await self.send_message(
            EventType.MEDIA_CONTROL,
            request_id,
            asdict(model),
            wait_for_response=False,
        )

    async def discord_control(
        self,
        model: DiscordControl,
        request_id: str | None = None,
    ) -> Response:
        """Discord control."""
        self._logger.info("Discord control: %s", model)
        return await self.send_message(
            EventType.DISCORD_CONTROL,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.DISCORD_CONTROLLED,
        )

    async def send_notification(
        self,
        model: Notification,
        request_id: str | None = None,
    ) -> Response:
        """Send notification."""
        self._logger.info("Send notification: %s", model)
        return await self.send_message(
            EventType.NOTIFICATION,
            request_id,
            model.to_payload(),
            wait_for_response=True,
            response_type=EventType.NOTIFICATION_SENT,
        )

    async def open_path(
        self,
        model: OpenPath,
        request_id: str | None = None,
    ) -> Response:
        """Open path."""
        self._logger.info("Opening path: %s", model)
        return await self.send_message(
            EventType.OPEN,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.OPENED,
        )

    async def open_url(
        self,
        model: OpenUrl,
        request_id: str | None = None,
    ) -> Response:
        """Open url."""
        self._logger.info("Opening URL: %s", model)
        return await self.send_message(
            EventType.OPEN,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.OPENED,
        )

    async def power_sleep(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power sleep."""
        self._logger.info("Power sleep")
        return await self.send_message(
            EventType.POWER_SLEEP,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_SLEEPING,
        )

    async def power_hibernate(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power hibernate."""
        self._logger.info("Power hibernate")
        return await self.send_message(
            EventType.POWER_HIBERNATE,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_HIBERNATING,
        )

    async def power_restart(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power restart."""
        self._logger.info("Power restart")
        return await self.send_message(
            EventType.POWER_RESTART,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_RESTARTING,
        )

    async def power_shutdown(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power shutdown."""
        self._logger.info("Power shutdown")
        return await self.send_message(
            EventType.POWER_SHUTDOWN,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_SHUTTINGDOWN,
        )

    async def power_lock(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power lock."""
        self._logger.info("Power lock")
        return await self.send_message(
            EventType.POWER_LOCK,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_LOCKING,
        )

    async def power_logout(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Power logout."""
        self._logger.info("Power logout")
        return await self.send_message(
            EventType.POWER_LOGOUT,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.POWER_LOGGINGOUT,
        )

    async def execute_command(
        self,
        model: ExecuteRequest,
        request_id: str | None = None,
        timeout: float = 8.0,
    ) -> ExecuteResult:
        """Execute command and wait for completion."""
        if timeout <= 0:
            raise ValueError(f"Timeout must be positive, got {timeout}")

        self._logger.info("Execute command: %s", model)
        response = await self.send_message(
            EventType.COMMAND_EXECUTE,
            request_id,
            asdict(model),
            wait_for_response=True,
            response_type=EventType.COMMAND_COMPLETED,
            timeout=timeout,
        )

        if response.type == EventType.ERROR:
            if response.subtype == "TIMEOUT":
                raise ConnectionErrorException(
                    response.message or "Timeout waiting for command execution response"
                )
            raise BadRequestException(response.message or "Command execution failed")

        if response.data is None:
            raise ValueError("Command execution response missing data")

        if not isinstance(response.data, dict):
            raise TypeError(
                f"Command execution response data must be a dict, got {type(response.data).__name__}"
            )

        return ExecuteResult(**response.data)

    async def get_commands(
        self,
        request_id: str | None = None,
    ) -> SettingsCommands:
        """Get commands from server settings."""
        self._logger.info("Getting commands from server")
        response = await self.send_message(
            EventType.GET_SETTINGS,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.SETTINGS_RESULT,
        )

        if response.type == EventType.ERROR:
            if response.subtype == "TIMEOUT":
                raise ConnectionErrorException(
                    response.message or "Timeout waiting for settings response"
                )
            raise BadRequestException(response.message or "Failed to get settings")

        if response.data is None:
            raise ValueError("Settings response missing data")

        if not isinstance(response.data, dict):
            raise TypeError(
                f"Settings response data must be a dict, got {type(response.data).__name__}"
            )

        commands_data = response.data.get("commands", {})
        if not isinstance(commands_data, dict):
            raise TypeError(
                f"Commands data must be a dict, got {type(commands_data).__name__}"
            )

        allowlist_data = commands_data.get("allowlist", [])
        if not isinstance(allowlist_data, list):
            raise TypeError(
                f"Allowlist must be a list, got {type(allowlist_data).__name__}"
            )

        allowlist = []
        for cmd_data in allowlist_data:
            if not isinstance(cmd_data, dict):
                raise TypeError(
                    f"Command definition must be a dict, got {type(cmd_data).__name__}"
                )

            # Validate required fields are present
            for field in ("id", "name", "command"):
                if field not in cmd_data:
                    raise ValueError(
                        f"Command definition missing required field '{field}'"
                    )

            allowlist.append(SettingsCommandDefinition(**cmd_data))

        return SettingsCommands(allowlist=allowlist)

    async def listen(
        self,
        callback: Callable[[str, Any], Awaitable[None]] | None = None,
        accept_other_types: bool = False,
        name: str = "WebSocket Listener",
    ) -> None:
        """Listen for messages and map to modules."""

        async def _callback_message(message: dict) -> None:
            """Message Callback."""
            self._logger.debug("[%s] New message: %s", name, message[EventKey.TYPE])

            if (
                message.get(EventKey.ID) is not None
                and (response_tuple := self._responses.get(message[EventKey.ID]))
                is not None
            ):
                future, response_type = response_tuple
                if (
                    response_type is not None
                    and response_type == message[EventKey.TYPE]
                ):
                    response = Response(**message)

                    if (
                        response.type == EventType.DATA_UPDATE
                        and response.module is not None
                        and message[EventKey.DATA] is not None
                    ):
                        # Find model from module
                        model_cls = MODEL_MAP.get(message[EventKey.MODULE])
                        if model_cls is None:
                            self._logger.warning(
                                "[%s] Unknown model: %s", name, message[EventKey.MODULE]
                            )
                        else:
                            self._logger.debug(
                                "[%s] Mapping data to model: %s",
                                name,
                                model_cls.__name__,
                            )
                            if isinstance(message[EventKey.DATA], list):
                                response.data = [
                                    model_cls(**data) for data in message[EventKey.DATA]
                                ]
                            else:
                                response.data = model_cls(**message[EventKey.DATA])

                    self._logger.info("[%s] Response: %s", name, response)

                    try:
                        future.set_result(response)
                    except asyncio.InvalidStateError:
                        self._logger.debug(
                            "[%s] Future already set for response ID: %s",
                            name,
                            message[EventKey.ID],
                        )

            if message[EventKey.TYPE] == EventType.ERROR:
                if (
                    message[EventKey.SUBTYPE]
                    == EventSubType.LISTENER_ALREADY_REGISTERED
                ):
                    self._logger.debug(
                        "[%s]: %s",
                        name,
                        message,
                    )
                elif (
                    message[EventKey.SUBTYPE] == EventSubType.BAD_TOKEN
                    or message[EventKey.SUBTYPE] == "BAD_API_KEY"
                ):
                    self._logger.error(
                        "[%s]: %s",
                        name,
                        message,
                    )
                    raise AuthenticationException(message[EventKey.MESSAGE])
                else:
                    self._logger.warning(
                        "[%s]: %s",
                        name,
                        message,
                    )
            elif (
                message[EventKey.TYPE] == EventType.DATA_UPDATE
                and message[EventKey.DATA] is not None
            ):
                self._logger.debug(
                    "[%s] New data for: %s\n%s",
                    name,
                    message[EventKey.MODULE],
                    message[EventKey.DATA],
                )
                model_cls = MODEL_MAP.get(message[EventKey.MODULE])
                if model_cls is None:
                    self._logger.warning(
                        "[%s] Unknown model: %s",
                        name,
                        message[EventKey.MODULE],
                    )
                elif callback is not None:
                    await callback(
                        message[EventKey.MODULE],
                        [model_cls(**data) for data in message[EventKey.DATA]]
                        if isinstance(message[EventKey.DATA], list)
                        else model_cls(**message[EventKey.DATA]),
                    )
            else:
                self._logger.debug(
                    "[%s] Other message: %s",
                    name,
                    message[EventKey.TYPE],
                )
                if accept_other_types:
                    model_cls = MODEL_MAP.get(
                        message[EventKey.TYPE],
                        Response,
                    )
                    if model_cls is not None and callback is not None:
                        await callback(
                            message[EventKey.TYPE],
                            model_cls(**message),
                        )

        await self.listen_for_messages(
            callback=_callback_message,
            name=name,
        )

    async def listen_for_messages(
        self,
        callback: Callable[[dict[Any, Any]], Awaitable[None]],
        name: str = "WebSocket Listener",
    ) -> None:
        """Listen for messages."""

        if not self.connected:
            raise ConnectionClosedException("Connection is closed")

        self._logger.info(
            "[%s] Listen for messages",
            name,
        )
        if self._websocket is not None:
            while not self._websocket.closed:
                message = await self.receive_message()
                if isinstance(message, dict):
                    await callback(message)

    async def receive_message(self) -> dict | None:
        """Receive message."""
        if not self.connected or self._websocket is None:
            raise ConnectionClosedException("Connection is closed")

        try:
            message = await self._websocket.receive()
        except RuntimeError:
            return None

        if message.type == aiohttp.WSMsgType.ERROR:
            raise ConnectionErrorException(self._websocket.exception())

        if message.type in (
            aiohttp.WSMsgType.CLOSE,
            aiohttp.WSMsgType.CLOSED,
            aiohttp.WSMsgType.CLOSING,
        ):
            raise ConnectionClosedException("Connection closed to server")

        if message.type == aiohttp.WSMsgType.TEXT:
            message_json = message.json()

            if message_json[EventKey.TYPE] == EventType.ERROR and (
                message_json[EventKey.SUBTYPE] == EventSubType.BAD_TOKEN
                or message_json[EventKey.SUBTYPE] == "BAD_API_KEY"
            ):
                raise AuthenticationException(message_json[EventKey.MESSAGE])

            return message_json

        raise BadMessageException(f"Unknown message type: {message.type}")

    async def send_message(
        self,
        event: str,
        request_id: str | None,
        data: dict[str, Any],
        wait_for_response: bool,
        response_type: str | None = None,
        timeout: float | None = None,
    ) -> Response:
        """Send a message to the WebSocket."""
        if not self.connected or self._websocket is None:
            raise ConnectionClosedException("Connection is closed")

        if timeout is not None and timeout <= 0:
            raise ValueError(f"Timeout must be positive, got {timeout}")

        request = Request(
            token=self._token,
            id=request_id if request_id is not None else uuid4().hex,
            event=event,
            data=data,
        )

        if not wait_for_response:
            await self._websocket.send_json(asdict(request))
            self._logger.debug("Sent message: %s", request)
            return Response(
                id=request.id,
                type="N/A",
                message="Message sent",
                subtype=None,
                module=None,
                data={},
            )

        future: asyncio.Future[Response] = asyncio.get_running_loop().create_future()
        self._responses[request.id] = future, response_type

        timeout_value = timeout if timeout is not None else 8.0
        try:
            await self._websocket.send_json(asdict(request))
            self._logger.debug("Sent message: %s", request)

            self._logger.info(
                "Waiting for future: event '%s' for request: %s (timeout: %s)",
                response_type,
                request,
                timeout_value,
            )
            return await asyncio.wait_for(future, timeout=timeout_value)
        except TimeoutError:
            self._logger.error(
                "Timeout waiting for future event '%s' for request: %s",
                response_type,
                request,
            )
            return Response(
                id=request.id,
                type=EventType.ERROR,
                subtype="TIMEOUT",
                message="Timeout waiting for response",
                data={
                    "id": request.id,
                    "event": request.event,
                    "data": request.data,
                },
            )
        finally:
            self._responses.pop(request.id)
