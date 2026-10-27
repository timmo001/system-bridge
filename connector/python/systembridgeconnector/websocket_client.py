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
from .models.audio_control import AudioControl
from .models.bluetooth_control import BluetoothDeviceRequest, BluetoothPowerRequest
from .models.command_execute import ExecuteRequest
from .models.command_prefab import CommandPrefab
from .models.command_result import ExecuteResult
from .models.desktop_control import (
    DesktopKeyboardLayoutRequest,
    DesktopWindowRequest,
    DesktopWindowStateRequest,
    DesktopWorkspaceRequest,
    HyprlandDispatchRequest,
    HyprlandEvent,
    HyprlandGlobalShortcutRequest,
    HyprlandMoveWindowRequest,
    HyprlandSetWindowRequest,
    OmarchyMenuRequest,
    OmarchyPanelRequest,
)
from .models.discord_control import DiscordControl
from .models.discord_setup import DiscordSetup, RedactedStr
from .models.display_control import DisplayControl
from .models.history import MetricHistory
from .models.keyboard_key import KeyboardKey
from .models.keyboard_text import KeyboardText
from .models.media_control import MediaControl
from .models.media_directories import MediaDirectory
from .models.media_files import FileInfo, MediaFile, MediaFiles
from .models.media_get_file import MediaGetFile
from .models.media_get_files import MediaGetFiles
from .models.modules import GetData, Module, ModulesData, RegisterDataListener
from .models.modules.disks import DiskMounts
from .models.notification import Notification
from .models.open_path import OpenPath
from .models.open_url import OpenUrl
from .models.request import Request
from .models.response import Response
from .models.settings import Settings, SettingsCommandDefinition, SettingsCommands

# The backend allows 30 seconds for a Bluetooth device to connect
BLUETOOTH_TIMEOUT = 35.0


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

        # The backend replies for every module asked for, with no data when it
        # has none, so a module has answered once any reply for it arrives
        answered: set[str] = set()

        async def handle_module(
            module_name: str,
            module: Any,
        ) -> None:
            """Handle returned data."""
            self._logger.debug("Set new data for: %s", module_name)
            setattr(modules_data, module_name, module)
            answered.add(module_name)

        async def handle_no_data(module_name: str) -> None:
            """Handle a module the backend has no data for."""
            answered.add(module_name)

        listener_task = asyncio.create_task(
            self.listen(
                callback=handle_module,
                accept_other_types=False,
                name="Get data WebSocket Listener",
                no_data_callback=handle_no_data,
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

        def modules_missing() -> list[str]:
            return [
                module_name
                for module_name in model.modules
                if getattr(modules_data, module_name) is None
            ]

        # Wait for every module to answer. Only a backend that never answers
        # waits for the timeout
        try:
            async with asyncio.timeout(timeout):
                while not all(module_name in answered for module_name in model.modules):
                    await asyncio.sleep(0.1)
                    if listener_task.done():
                        break
        except TimeoutError as exception:
            self._logger.error(
                "Timeout waiting for data after %s seconds. Modules missing: %s",
                timeout,
                modules_missing(),
            )
            raise DataMissingException(
                f"Timeout waiting for data after {timeout} seconds. Modules missing: {modules_missing()}"
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

        if missing := modules_missing():
            self._logger.error("No data received for modules: %s", missing)
            raise DataMissingException(f"No data received for modules: {missing}")

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

    async def get_history(
        self,
        since: int | None = None,
        modules: list[Module] | None = None,
        request_id: str | None = None,
    ) -> MetricHistory:
        """Get graph readings from up to the last 24 hours.

        With since, in Unix milliseconds, only readings taken after it, and
        with modules, only those modules' readings.
        """
        self._logger.info("Getting history")
        request: dict[str, Any] = {}
        if since is not None:
            request["since"] = since
        if modules:
            request["modules"] = [str(module) for module in modules]
        response = await self.send_message(
            EventType.GET_HISTORY,
            request_id,
            request,
            wait_for_response=True,
            response_type=EventType.HISTORY,
        )

        return MetricHistory(**self._response_dict(response, "history"))

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

    async def _change_command(
        self,
        event: EventType,
        response_type: EventType,
        data: dict[str, Any],
        request_id: str | None,
    ) -> Settings:
        """Change one command in the allowlist, returning the saved settings."""
        self._logger.info("Command change %s: %s", event, data.get("id"))
        response = await self.send_message(
            event,
            request_id,
            data,
            wait_for_response=True,
            response_type=response_type,
        )

        return Settings(**self._response_dict(response, "command change"))

    async def add_command(
        self,
        command: SettingsCommandDefinition,
        request_id: str | None = None,
    ) -> Settings:
        """Add one command to the allowlist, leaving the others as they are."""
        return await self._change_command(
            EventType.COMMAND_ADD,
            EventType.COMMAND_ADDED,
            asdict(command),
            request_id,
        )

    async def update_command(
        self,
        command: SettingsCommandDefinition,
        request_id: str | None = None,
    ) -> Settings:
        """Change one saved command, failing if another client removed it."""
        return await self._change_command(
            EventType.COMMAND_UPDATE,
            EventType.COMMAND_UPDATED,
            asdict(command),
            request_id,
        )

    async def remove_command(
        self,
        command_id: str,
        request_id: str | None = None,
    ) -> Settings:
        """Remove one command from the allowlist."""
        return await self._change_command(
            EventType.COMMAND_REMOVE,
            EventType.COMMAND_REMOVED,
            {"id": command_id},
            request_id,
        )

    async def get_discord_setup(
        self,
        request_id: str | None = None,
    ) -> DiscordSetup:
        """Get how far Discord is set up."""
        self._logger.info("Getting Discord setup")
        response = await self.send_message(
            EventType.GET_DISCORD_SETUP,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.DISCORD_SETUP,
        )

        return DiscordSetup(**self._response_dict(response, "Discord setup"))

    async def update_discord_setup(
        self,
        client_id: str,
        client_secret: str,
        request_id: str | None = None,
    ) -> DiscordSetup:
        """Save the Discord application's credentials and reconnect.

        The secret is redacted from the request in logs.
        """
        self._logger.info("Updating Discord setup")
        response = await self.send_message(
            EventType.UPDATE_DISCORD_SETUP,
            request_id,
            {"clientId": client_id, "clientSecret": RedactedStr(client_secret)},
            wait_for_response=True,
            response_type=EventType.DISCORD_SETUP_UPDATED,
        )

        return DiscordSetup(**self._response_dict(response, "update Discord setup"))

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

    async def audio_control(
        self,
        model: AudioControl,
        request_id: str | None = None,
    ) -> Response:
        """Set an audio device's volume or mute state, or make it the default."""
        self._logger.info("Audio control: %s", model)
        return await self.send_message(
            EventType.AUDIO_CONTROL,
            request_id,
            {key: value for key, value in asdict(model).items() if value is not None},
            wait_for_response=True,
            response_type=EventType.AUDIO_CONTROLLED,
        )

    async def _action(
        self,
        event: EventType,
        response_type: EventType,
        model: Any,
        request_id: str | None,
        timeout: float | None = None,
    ) -> Response:
        """Send an action, leaving out the settings that are None."""
        self._logger.info("Action %s: %s", event, model)
        return await self.send_message(
            event,
            request_id,
            {key: value for key, value in asdict(model).items() if value is not None},
            wait_for_response=True,
            response_type=response_type,
            timeout=timeout,
        )

    async def bluetooth_connect(
        self,
        model: BluetoothDeviceRequest,
        request_id: str | None = None,
    ) -> Response:
        """Connect a paired device, waiting until it's connected. Linux only."""
        return await self._action(
            EventType.BLUETOOTH_CONNECT,
            EventType.BLUETOOTH_CONNECTED,
            model,
            request_id,
            BLUETOOTH_TIMEOUT,
        )

    async def bluetooth_disconnect(
        self,
        model: BluetoothDeviceRequest,
        request_id: str | None = None,
    ) -> Response:
        """Disconnect a paired device. Linux only."""
        return await self._action(
            EventType.BLUETOOTH_DISCONNECT,
            EventType.BLUETOOTH_DISCONNECTED,
            model,
            request_id,
            BLUETOOTH_TIMEOUT,
        )

    async def bluetooth_forget(
        self,
        model: BluetoothDeviceRequest,
        request_id: str | None = None,
    ) -> Response:
        """Forget (unpair) a device. Linux and Windows."""
        return await self._action(
            EventType.BLUETOOTH_FORGET,
            EventType.BLUETOOTH_FORGOTTEN,
            model,
            request_id,
            BLUETOOTH_TIMEOUT,
        )

    async def bluetooth_set_power(
        self,
        model: BluetoothPowerRequest,
        request_id: str | None = None,
    ) -> Response:
        """Turn the Bluetooth adapter on or off. Linux only."""
        return await self._action(
            EventType.BLUETOOTH_SET_POWER,
            EventType.BLUETOOTH_POWER_SET,
            model,
            request_id,
            BLUETOOTH_TIMEOUT,
        )

    async def desktop_close_window(
        self,
        model: DesktopWindowRequest,
        request_id: str | None = None,
    ) -> Response:
        """Ask a window to close, as its close button would."""
        return await self._action(
            EventType.DESKTOP_CLOSE_WINDOW,
            EventType.DESKTOP_WINDOW_CLOSED,
            model,
            request_id,
        )

    async def desktop_focus_window(
        self,
        model: DesktopWindowRequest,
        request_id: str | None = None,
    ) -> Response:
        """Focus a window, showing its workspace."""
        return await self._action(
            EventType.DESKTOP_FOCUS_WINDOW,
            EventType.DESKTOP_WINDOW_FOCUSED,
            model,
            request_id,
        )

    async def desktop_focus_workspace(
        self,
        model: DesktopWorkspaceRequest,
        request_id: str | None = None,
    ) -> Response:
        """Show and focus a workspace. Not on Windows."""
        return await self._action(
            EventType.DESKTOP_FOCUS_WORKSPACE,
            EventType.DESKTOP_WORKSPACE_FOCUSED,
            model,
            request_id,
        )

    async def desktop_set_keyboard_layout(
        self,
        model: DesktopKeyboardLayoutRequest,
        request_id: str | None = None,
    ) -> Response:
        """Switch the keyboard layout. Hyprland and Windows only."""
        return await self._action(
            EventType.DESKTOP_SET_KEYBOARD_LAYOUT,
            EventType.DESKTOP_KEYBOARD_LAYOUT_SET,
            model,
            request_id,
        )

    async def desktop_set_window_state(
        self,
        model: DesktopWindowStateRequest,
        request_id: str | None = None,
    ) -> Response:
        """Make a window fullscreen, maximised or minimised, or not."""
        return await self._action(
            EventType.DESKTOP_SET_WINDOW_STATE,
            EventType.DESKTOP_WINDOW_STATE_SET,
            model,
            request_id,
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

    async def display_control(
        self,
        model: DisplayControl,
        request_id: str | None = None,
    ) -> Response:
        """Set a display's brightness or power state."""
        self._logger.info("Display control: %s", model)
        return await self.send_message(
            EventType.DISPLAY_CONTROL,
            request_id,
            {key: value for key, value in asdict(model).items() if value is not None},
            wait_for_response=True,
            response_type=EventType.DISPLAY_CONTROLLED,
        )

    async def hyprland_dispatch(
        self,
        model: HyprlandDispatchRequest,
        request_id: str | None = None,
    ) -> Response:
        """Run a dispatcher on the focused window, as its bind would."""
        return await self._action(
            EventType.HYPRLAND_DISPATCH,
            EventType.HYPRLAND_DISPATCHED,
            model,
            request_id,
        )

    async def hyprland_move_window(
        self,
        model: HyprlandMoveWindowRequest,
        request_id: str | None = None,
    ) -> Response:
        """Move a window to a workspace, leaving the focus where it is."""
        return await self._action(
            EventType.HYPRLAND_MOVE_WINDOW,
            EventType.HYPRLAND_WINDOW_MOVED,
            model,
            request_id,
        )

    async def hyprland_reload_config(
        self,
        request_id: str | None = None,
    ) -> Response:
        """Reload Hyprland's config."""
        self._logger.info("Reloading Hyprland's config")
        return await self.send_message(
            EventType.HYPRLAND_RELOAD_CONFIG,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.HYPRLAND_CONFIG_RELOADED,
        )

    async def hyprland_run_global_shortcut(
        self,
        model: HyprlandGlobalShortcutRequest,
        request_id: str | None = None,
    ) -> Response:
        """Trigger a global shortcut an app registered, as a bind to it would."""
        return await self._action(
            EventType.HYPRLAND_RUN_GLOBAL_SHORTCUT,
            EventType.HYPRLAND_GLOBAL_SHORTCUT_RUN,
            model,
            request_id,
        )

    async def hyprland_set_window(
        self,
        model: HyprlandSetWindowRequest,
        request_id: str | None = None,
    ) -> Response:
        """Float or tile a window, and pin or unpin it."""
        return await self._action(
            EventType.HYPRLAND_SET_WINDOW,
            EventType.HYPRLAND_WINDOW_SET,
            model,
            request_id,
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
            wait_for_response=True,
            response_type=EventType.MEDIA_CONTROLLED,
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

    async def omarchy_menu(
        self,
        model: OmarchyMenuRequest,
        request_id: str | None = None,
    ) -> Response:
        """Open, close or toggle the Omarchy menu at a route."""
        return await self._action(
            EventType.OMARCHY_MENU,
            EventType.OMARCHY_MENU_CHANGED,
            model,
            request_id,
        )

    async def omarchy_panel(
        self,
        model: OmarchyPanelRequest,
        request_id: str | None = None,
    ) -> Response:
        """Open, close or toggle an Omarchy shell panel."""
        return await self._action(
            EventType.OMARCHY_PANEL,
            EventType.OMARCHY_PANEL_CHANGED,
            model,
            request_id,
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

    async def get_command_prefabs(
        self,
        request_id: str | None = None,
    ) -> list[CommandPrefab]:
        """Get the ready-made commands and whether each can run on the server."""
        self._logger.info("Getting command prefabs")
        response = await self.send_message(
            EventType.GET_COMMAND_PREFABS,
            request_id,
            {},
            wait_for_response=True,
            response_type=EventType.COMMAND_PREFABS,
        )

        if response.type == EventType.ERROR:
            if response.subtype == "TIMEOUT":
                raise ConnectionErrorException(
                    response.message or "Timeout waiting for command prefabs response"
                )
            raise BadRequestException(
                response.message or "Failed to get command prefabs"
            )

        if not isinstance(response.data, list):
            raise TypeError(
                f"Command prefabs response data must be a list, got {type(response.data).__name__}"
            )

        return [CommandPrefab(**prefab) for prefab in response.data]

    async def listen(
        self,
        callback: Callable[[str, Any], Awaitable[None]] | None = None,
        accept_other_types: bool = False,
        name: str = "WebSocket Listener",
        settings_callback: Callable[[Settings], Awaitable[None]] | None = None,
        no_data_callback: Callable[[str], Awaitable[None]] | None = None,
        hyprland_event_callback: Callable[[HyprlandEvent], Awaitable[None]]
        | None = None,
    ) -> None:
        """Listen for messages and map to modules.

        settings_callback gets the settings each time any client changes them.
        no_data_callback gets a module's name when the backend answers for it
        with no data. hyprland_event_callback gets each custom event from
        Hyprland, once listening for the desktop module.
        """

        async def _callback_message(message: dict) -> None:
            """Message Callback."""
            self._logger.debug("[%s] New message: %s", name, message[EventKey.TYPE])

            if (
                message.get(EventKey.ID) is not None
                and (response_tuple := self._responses.get(message[EventKey.ID]))
                is not None
            ):
                future, response_type = response_tuple
                # An error for this request answers it, rather than leaving it
                # to time out
                if response_type is not None and message[EventKey.TYPE] in (
                    response_type,
                    EventType.ERROR,
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
            elif (
                message[EventKey.TYPE] == EventType.DATA_UPDATE
                and no_data_callback is not None
                and message.get(EventKey.MODULE)
            ):
                self._logger.debug(
                    "[%s] No data for: %s", name, message[EventKey.MODULE]
                )
                await no_data_callback(message[EventKey.MODULE])
            elif (
                message[EventKey.TYPE] == EventType.SETTINGS_CHANGED
                and settings_callback is not None
                and isinstance(message.get(EventKey.DATA), dict)
            ):
                self._logger.debug("[%s] Settings changed", name)
                await settings_callback(Settings(**message[EventKey.DATA]))
            elif (
                message[EventKey.TYPE] == EventType.HYPRLAND_EVENT
                and hyprland_event_callback is not None
                and isinstance(message.get(EventKey.DATA), dict)
            ):
                self._logger.debug("[%s] Hyprland event", name)
                await hyprland_event_callback(
                    HyprlandEvent(data=message[EventKey.DATA].get("data", ""))
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

        # aiohttp raises RuntimeError when two listeners share this connection.
        # Let it propagate: swallowing it made listen() spin forever.
        message = await self._websocket.receive()

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
