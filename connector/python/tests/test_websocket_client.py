"""Test the websocket client module."""

import asyncio
from dataclasses import asdict
from json import dumps
from unittest.mock import Mock, patch

import aiohttp
import pytest
from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.const import EventSubType, EventType
from systembridgeconnector.exceptions import (
    AuthenticationException,
    BadMessageException,
    ConnectionClosedException,
    ConnectionErrorException,
    DataMissingException,
)
from systembridgeconnector.models.command_execute import ExecuteRequest
from systembridgeconnector.models.command_result import ExecuteResult
from systembridgeconnector.models.discord_control import DiscordAction, DiscordControl
from systembridgeconnector.models.keyboard_key import KeyboardKey
from systembridgeconnector.models.keyboard_text import KeyboardText
from systembridgeconnector.models.media_control import MediaControl
from systembridgeconnector.models.media_directories import MediaDirectory
from systembridgeconnector.models.media_get_file import MediaGetFile
from systembridgeconnector.models.media_get_files import MediaGetFiles
from systembridgeconnector.models.modules import GetData, Module, RegisterDataListener
from systembridgeconnector.models.modules.disks import (
    DiskMountInfo,
    DiskMounts,
    DiskUsage,
)
from systembridgeconnector.models.notification import Notification
from systembridgeconnector.models.open_path import OpenPath
from systembridgeconnector.models.open_url import OpenUrl
from systembridgeconnector.models.response import Response
from systembridgeconnector.models.settings import SettingsCommands
from systembridgeconnector.models.update import Update
from systembridgeconnector.websocket_client import WebSocketClient

from . import API_HOST, REQUEST_ID, ClientSessionGenerator


@pytest.mark.asyncio
async def test_connect(mock_websocket_client_connected: WebSocketClient):
    """Test the websocket client."""
    assert mock_websocket_client_connected.connected


@pytest.mark.asyncio
async def test_connect_error(mock_websocket_client: WebSocketClient):
    """Test the websocket client."""
    with (
        patch(
            "aiohttp.ClientSession.ws_connect",
            side_effect=aiohttp.ClientConnectionError(),
        ),
        pytest.raises(ConnectionErrorException),
    ):
        await mock_websocket_client.connect()


@pytest.mark.asyncio
async def test_connection_closed(mock_websocket_client_connected: WebSocketClient):
    """Test the websocket client."""
    await mock_websocket_client_connected.close()

    with pytest.raises(ConnectionClosedException):
        await mock_websocket_client_connected.application_update(
            Update(version="1.0.0"),
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_close(mock_websocket_client_connected: WebSocketClient):
    """Test the websocket client."""
    await mock_websocket_client_connected.close()

    assert not mock_websocket_client_connected.connected


@pytest.mark.asyncio
async def test_application_update(
    snapshot: SnapshotAssertion,
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_connected.application_update(
            Update(version="1.0.0"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_exit_backend(
    snapshot: SnapshotAssertion,
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_connected.exit_backend(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_get_data(
    snapshot: SnapshotAssertion,
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_connected.get_data(
            GetData(modules=[Module.SYSTEM]),
            request_id=REQUEST_ID,
            timeout=8,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_get_directories(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.get_directories(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_get_directories_without_name_field(
    mock_websocket_client: WebSocketClient,
):
    """Test get_directories handles API response without 'name' field."""
    # Mock response with only 'key' and 'path' (no 'name')
    mock_response = Response(
        id=REQUEST_ID,
        type=EventType.DIRECTORIES,
        data=[
            {"key": "documents", "path": "/home/user/documents"},
            {"key": "music", "path": "/home/user/music"},
        ],
    )

    with patch.object(
        mock_websocket_client,
        "send_message",
        return_value=mock_response,
    ):
        directories = await mock_websocket_client.get_directories(
            request_id=REQUEST_ID,
        )

        assert len(directories) == 2
        assert isinstance(directories[0], MediaDirectory)
        assert directories[0].key == "documents"
        assert directories[0].name == "Documents"  # Derived from key
        assert directories[0].path == "/home/user/documents"
        assert directories[1].key == "music"
        assert directories[1].name == "Music"  # Derived from key
        assert directories[1].path == "/home/user/music"


@pytest.mark.asyncio
async def test_get_directories_with_name_field(
    mock_websocket_client: WebSocketClient,
):
    """Test get_directories handles API response with 'name' field."""
    # Mock response with 'name' field present
    mock_response = Response(
        id=REQUEST_ID,
        type=EventType.DIRECTORIES,
        data=[
            {
                "key": "documents",
                "name": "My Documents",
                "path": "/home/user/documents",
            },
        ],
    )

    with patch.object(
        mock_websocket_client,
        "send_message",
        return_value=mock_response,
    ):
        directories = await mock_websocket_client.get_directories(
            request_id=REQUEST_ID,
        )

        assert len(directories) == 1
        assert isinstance(directories[0], MediaDirectory)
        assert directories[0].key == "documents"
        assert directories[0].name == "My Documents"  # Uses name from API
        assert directories[0].path == "/home/user/documents"


@pytest.mark.asyncio
async def test_get_directories_edge_cases(
    mock_websocket_client: WebSocketClient,
):
    """Test get_directories handles edge cases."""
    # Mock response with edge cases
    mock_response = Response(
        id=REQUEST_ID,
        type=EventType.DIRECTORIES,
        data=[
            {"key": "", "path": "/home/user/empty"},  # Empty key
            {"key": "a", "path": "/home/user/single"},  # Single character
            {
                "key": "mixedCase",
                "path": "/home/user/mixed",
            },  # Mixed case key
            {
                "key": "documents",
                "path": "/home/user/documents",
                "description": "Test description",
            },  # With description
        ],
    )

    with patch.object(
        mock_websocket_client,
        "send_message",
        return_value=mock_response,
    ):
        directories = await mock_websocket_client.get_directories(
            request_id=REQUEST_ID,
        )

        assert len(directories) == 4
        assert directories[0].key == ""
        assert directories[0].name == ""  # Empty key results in empty name
        assert directories[1].key == "a"
        assert directories[1].name == "A"  # Single character capitalized
        assert directories[2].key == "mixedCase"
        assert directories[2].name == "MixedCase"  # First letter capitalized
        assert directories[3].description == "Test description"


@pytest.mark.asyncio
async def test_get_files(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.get_files(
            MediaGetFiles(
                base="documents",
                path="/home/user/documents",
            ),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_get_file(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.get_file(
            MediaGetFile(
                base="documents",
                path="/home/user/documents/test.txt",
            ),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_register_data_listener(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.register_data_listener(
            RegisterDataListener(modules=[Module.SYSTEM]),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_keyboard_keypress(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.keyboard_keypress(
            KeyboardKey(key="a"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_keyboard_text(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.keyboard_text(
            KeyboardText(text="test"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_media_control(
    snapshot: SnapshotAssertion,
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_connected.media_control(
            MediaControl(action="play"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_discord_control(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.discord_control(
            DiscordControl(action=DiscordAction.TOGGLE_MUTE),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_get_disk_mounts(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    disk_mounts = await mock_websocket_client_listening.get_disk_mounts(
        request_id=REQUEST_ID,
    )
    assert isinstance(disk_mounts, DiskMounts)
    assert isinstance(disk_mounts.primary[0], DiskMountInfo)
    assert isinstance(disk_mounts.primary[0].usage, DiskUsage)
    assert isinstance(disk_mounts.secondary.squashfs[0], DiskMountInfo)
    assert disk_mounts == snapshot


@pytest.mark.asyncio
async def test_send_notification(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.send_notification(
            Notification(
                title="Test",
                message="test",
            ),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_send_notification_with_new_fields(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test send notification with new fields."""
    assert (
        await mock_websocket_client_listening.send_notification(
            Notification(
                title="Test",
                message="test",
                duration=3000,
                action_url="https://example.com",
                action_path="/home/user/documents",
                sound="/home/user/notify.wav",
            ),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_open_path(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.open_path(
            OpenPath(path="/home/user/documents"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_open_url(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.open_url(
            OpenUrl(url="https://www.google.com"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_sleep(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_sleep(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_hibernate(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_hibernate(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_restart(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_restart(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_shutdown(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_shutdown(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_lock(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_lock(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_power_logout(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.power_logout(
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_execute_command(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    result = await mock_websocket_client_listening.execute_command(
        ExecuteRequest(commandID="test-command"),
        request_id=REQUEST_ID,
    )
    assert isinstance(result, ExecuteResult)
    assert result.commandID == "test-command"
    assert result.exitCode == 0
    assert result.stdout == "Command output"
    assert result == snapshot


@pytest.mark.asyncio
async def test_get_commands(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test getting commands."""
    commands = await mock_websocket_client_listening.get_commands(
        request_id=REQUEST_ID,
    )
    assert isinstance(commands, SettingsCommands)
    assert commands.allowlist is not None
    assert len(commands.allowlist) > 0
    assert commands == snapshot


@pytest.mark.asyncio
async def test_execute_command_data_missing(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test execute_command when response data is None."""
    mock_response = Mock(spec=Response)
    mock_response.data = None
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(ValueError, match="Command execution response missing data"),
    ):
        await mock_websocket_client_listening.execute_command(
            ExecuteRequest(commandID="test-command"),
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_data_missing(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when response data is None."""
    mock_response = Mock(spec=Response)
    mock_response.data = None
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(ValueError, match="Settings response missing data"),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_execute_command_timeout(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test execute_command with custom timeout."""
    result = await mock_websocket_client_listening.execute_command(
        ExecuteRequest(commandID="test-command"),
        request_id=REQUEST_ID,
        timeout=60.0,
    )
    assert isinstance(result, ExecuteResult)
    assert result.commandID == "test-command"
    assert result == snapshot


@pytest.mark.asyncio
async def test_execute_command_data_not_dict(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test execute_command when response data is not a dict."""
    mock_response = Mock(spec=Response)
    mock_response.data = ["not", "a", "dict"]
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(
            TypeError, match="Command execution response data must be a dict"
        ),
    ):
        await mock_websocket_client_listening.execute_command(
            ExecuteRequest(commandID="test-command"),
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_data_not_dict(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when response data is not a dict."""
    mock_response = Mock(spec=Response)
    mock_response.data = ["not", "a", "dict"]
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(TypeError, match="Settings response data must be a dict"),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_commands_not_dict(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when commands data is not a dict."""
    mock_response = Mock(spec=Response)
    mock_response.data = {"commands": "not a dict"}
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(TypeError, match="Commands data must be a dict"),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_allowlist_not_list(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when allowlist is not a list."""
    mock_response = Mock(spec=Response)
    mock_response.data = {"commands": {"allowlist": "not a list"}}
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(TypeError, match="Allowlist must be a list"),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_command_not_dict(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when command definition is not a dict."""
    mock_response = Mock(spec=Response)
    mock_response.data = {"commands": {"allowlist": ["not a dict"]}}
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(TypeError, match="Command definition must be a dict"),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_missing_id(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when command definition is missing id."""
    mock_response = Mock(spec=Response)
    mock_response.data = {
        "commands": {
            "allowlist": [
                {
                    "name": "Test Command",
                    "command": "/usr/bin/test",
                }
            ]
        }
    }
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(
            ValueError, match="Command definition missing required field 'id'"
        ),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_missing_name(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when command definition is missing name."""
    mock_response = Mock(spec=Response)
    mock_response.data = {
        "commands": {
            "allowlist": [
                {
                    "id": "test-command-id",
                    "command": "/usr/bin/test",
                }
            ]
        }
    }
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(
            ValueError, match="Command definition missing required field 'name'"
        ),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_get_commands_missing_command(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test get_commands when command definition is missing command."""
    mock_response = Mock(spec=Response)
    mock_response.data = {
        "commands": {
            "allowlist": [
                {
                    "id": "test-command-id",
                    "name": "Test Command",
                }
            ]
        }
    }
    with (
        patch.object(
            mock_websocket_client_listening,
            "send_message",
            return_value=mock_response,
        ),
        pytest.raises(
            ValueError, match="Command definition missing required field 'command'"
        ),
    ):
        await mock_websocket_client_listening.get_commands(
            request_id=REQUEST_ID,
        )


@pytest.mark.asyncio
async def test_wait_for_response_timeout(
    snapshot: SnapshotAssertion,
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with patch(
        "systembridgeconnector.websocket_client.asyncio.wait_for",
        side_effect=TimeoutError(),
    ):
        assert (
            await mock_websocket_client_connected.get_data(
                GetData(modules=[Module.SYSTEM]),
                request_id=REQUEST_ID,
                timeout=1,
            )
            == snapshot
        )


@pytest.mark.asyncio
async def test_send_message_timeout_omits_token(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test a timed out request does not return the token."""
    with patch(
        "systembridgeconnector.websocket_client.asyncio.wait_for",
        side_effect=TimeoutError(),
    ):
        response = await mock_websocket_client_connected.send_message(
            EventType.GET_DATA,
            REQUEST_ID,
            {"modules": [Module.SYSTEM]},
            wait_for_response=True,
            response_type=EventType.DATA_GET,
        )

    assert response.subtype == "TIMEOUT"
    assert "token" not in response.data


@pytest.mark.asyncio
async def test_request_ids_are_unique(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test each request gets its own ID when none is given."""
    first = await mock_websocket_client_connected.media_control(
        MediaControl(action="PLAY")
    )
    second = await mock_websocket_client_connected.media_control(
        MediaControl(action="PLAY")
    )

    assert first.id != second.id


@pytest.mark.asyncio
async def test_get_data_data_missing(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with pytest.raises(DataMissingException):
        await mock_websocket_client_connected.get_data(
            GetData(modules=[Module.CPU]),
            request_id=REQUEST_ID,
            timeout=1,
        )


@pytest.mark.asyncio
async def test_get_data_task_cancelled(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "systembridgeconnector.websocket_client.WebSocketClient.listen",
            side_effect=asyncio.CancelledError(),
        ),
        pytest.raises(asyncio.CancelledError),
    ):
        await mock_websocket_client_listening.get_data(
            GetData(modules=[Module.SYSTEM]),
            request_id=REQUEST_ID,
            timeout=1,
        )


@pytest.mark.asyncio
async def test_get_data_task_exception(
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "systembridgeconnector.websocket_client.WebSocketClient.listen",
            side_effect=ConnectionClosedException(),
        ),
        pytest.raises(ConnectionClosedException),
    ):
        await mock_websocket_client_listening.get_data(
            GetData(modules=[Module.SYSTEM]),
            request_id=REQUEST_ID,
            timeout=1,
        )


@pytest.mark.asyncio
async def test_unknown_message(
    snapshot: SnapshotAssertion,
    mock_websocket_client_listening: WebSocketClient,
):
    """Test the websocket client."""
    assert (
        await mock_websocket_client_listening.send_message(
            event="BAD_TYPE",
            request_id=REQUEST_ID,
            data={},
            wait_for_response=False,
            response_type="BAD_TYPE",
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_bad_token(
    snapshot: SnapshotAssertion,
    mock_websocket_session: ClientSessionGenerator,
):
    """Test the websocket client."""
    client = await mock_websocket_session()
    ws = await client.ws_connect("/api/websocket")

    websocket_client = WebSocketClient(
        api_host=API_HOST,
        api_port=client.port,
        token="badtoken",
        session=client.session,
        websocket=ws,
        can_close_session=True,
    )

    await websocket_client.connect()

    assert (
        await websocket_client.application_update(
            Update(version="1.0.0"),
            request_id=REQUEST_ID,
        )
        == snapshot
    )


@pytest.mark.asyncio
async def test_listen_for_messages_disconnnected(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    await mock_websocket_client_connected.close()

    async def callback(_):
        pass

    with pytest.raises(ConnectionClosedException):
        await mock_websocket_client_connected.listen_for_messages(
            callback=callback,
            name="Test WebSocket Listener",
        )


@pytest.mark.asyncio
async def test_receive_message_disconnnected(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    await mock_websocket_client_connected.close()

    with pytest.raises(ConnectionClosedException):
        await mock_websocket_client_connected.receive_message()


@pytest.mark.asyncio
async def test_receive_message_runtime_error(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with patch(
        "aiohttp.ClientWebSocketResponse.receive",
        side_effect=RuntimeError(),
    ):
        assert await mock_websocket_client_connected.receive_message() is None


@pytest.mark.asyncio
async def test_receive_message_type_close(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "aiohttp.ClientWebSocketResponse.receive",
            return_value=aiohttp.WSMessage(
                type=aiohttp.WSMsgType.CLOSE,
                data=None,
                extra=None,
            ),
        ),
        pytest.raises(ConnectionClosedException),
    ):
        await mock_websocket_client_connected.receive_message()


@pytest.mark.asyncio
async def test_receive_message_type_error(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "aiohttp.ClientWebSocketResponse.receive",
            return_value=aiohttp.WSMessage(
                type=aiohttp.WSMsgType.ERROR,
                data=None,
                extra=None,
            ),
        ),
        pytest.raises(ConnectionErrorException),
    ):
        await mock_websocket_client_connected.receive_message()


@pytest.mark.asyncio
async def test_receive_message_bad_token(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "aiohttp.ClientWebSocketResponse.receive",
            return_value=aiohttp.WSMessage(
                type=aiohttp.WSMsgType.TEXT,
                data=dumps(
                    asdict(
                        Response(
                            id=REQUEST_ID,
                            type=EventType.ERROR,
                            subtype=EventSubType.BAD_TOKEN,
                            data={},
                        )
                    )
                ),
                extra=None,
            ),
        ),
        pytest.raises(AuthenticationException),
    ):
        await mock_websocket_client_connected.receive_message()


@pytest.mark.asyncio
async def test_receive_message_type_unknown_message(
    mock_websocket_client_connected: WebSocketClient,
):
    """Test the websocket client."""
    with (
        patch(
            "aiohttp.ClientWebSocketResponse.receive",
            return_value=aiohttp.WSMessage(
                type=aiohttp.WSMsgType.BINARY,
                data=None,
                extra=None,
            ),
        ),
        pytest.raises(BadMessageException),
    ):
        await mock_websocket_client_connected.receive_message()
