"""Test the http client module."""

import asyncio
from datetime import timedelta
from unittest.mock import patch

import pytest

from systembridgeconnector.exceptions import (
    AuthenticationException,
    BadRequestException,
    ConnectionErrorException,
)
from systembridgeconnector.http_client import HTTPClient
from systembridgeconnector.models.fixtures.modules.cpu import FIXTURE_CPU
from systembridgeconnector.models.fixtures.modules.displays import FIXTURE_DISPLAYS
from systembridgeconnector.models.keys import KeyClient
from systembridgeconnector.models.modules import Module

from . import CLIENT_KEY, TOKEN


@pytest.mark.asyncio
async def test_get_health(mock_http_client: HTTPClient):
    """Test the get health method."""
    health = await mock_http_client.get_health()
    assert health["status"] == "healthy"


@pytest.mark.asyncio
async def test_get_module_data(mock_http_client: HTTPClient):
    """Test the get module data method maps data to models."""
    assert await mock_http_client.get_module_data(Module.CPU) == FIXTURE_CPU
    assert await mock_http_client.get_module_data(Module.DISPLAYS) == FIXTURE_DISPLAYS


@pytest.mark.asyncio
async def test_exchange_key(mock_http_client: HTTPClient):
    """Test the old token is traded for the client's own key."""
    client = KeyClient(id="ha-entry", name="Home Assistant", kind="home-assistant")
    new_key = await mock_http_client.exchange_key(client)
    assert new_key.key == CLIENT_KEY
    assert new_key.client == client
    assert CLIENT_KEY not in repr(new_key)


@pytest.mark.asyncio
async def test_media_file_url(mock_http_client: HTTPClient):
    """Test a media file URL comes signed from System Bridge, without the key."""
    url = await mock_http_client.media_file_url(
        "music", "song.mp3", timedelta(minutes=5)
    )
    assert url.startswith("http://127.0.0.1:")
    assert "/api/media/file/data?" in url
    assert "expires=300" in url
    assert TOKEN not in url


@pytest.mark.asyncio
async def test_delete(mock_http_client: HTTPClient):
    """Test the delete method."""
    response_json = await mock_http_client.delete("/test/json", None)
    assert isinstance(response_json, dict)
    assert response_json == {"test": "test"}


@pytest.mark.asyncio
async def test_get(mock_http_client: HTTPClient):
    """Test the get method."""
    response_json = await mock_http_client.get("/test/json")
    assert isinstance(response_json, dict)
    assert response_json == {"test": "test"}

    response_text = await mock_http_client.get("/test/text")
    assert response_text == "test"


@pytest.mark.asyncio
async def test_post(mock_http_client: HTTPClient):
    """Test the post method."""
    response_json = await mock_http_client.post("/test/json", None)
    assert isinstance(response_json, dict)
    assert response_json == {"test": "test"}


@pytest.mark.asyncio
async def test_put(mock_http_client: HTTPClient):
    """Test the put method."""
    response_json = await mock_http_client.put("/test/json", None)
    assert isinstance(response_json, dict)
    assert response_json == {"test": "test"}


@pytest.mark.asyncio
async def test_bad_request(mock_http_client: HTTPClient):
    """Test the bad request response."""
    with pytest.raises(BadRequestException):
        await mock_http_client.get("/test/badrequest")


@pytest.mark.asyncio
async def test_not_found(mock_http_client: HTTPClient):
    """Test the not found response."""
    with pytest.raises(ConnectionErrorException):
        await mock_http_client.get("/test/notfound")


@pytest.mark.asyncio
async def test_unauthorised(mock_http_client: HTTPClient):
    """Test the unauthorised response."""
    with pytest.raises(AuthenticationException):
        await mock_http_client.get("/test/unauthorised")


@pytest.mark.asyncio
async def test_timeout(mock_http_client: HTTPClient):
    """Test the timeout."""
    with (
        patch(
            "aiohttp.client.ClientSession.request",
            side_effect=asyncio.TimeoutError,
        ),
        pytest.raises(ConnectionErrorException),
    ):
        await mock_http_client.get("/test/json")


@pytest.mark.asyncio
async def test_connection_error(mock_http_client: HTTPClient):
    """Test the connection error."""
    with (
        patch(
            "aiohttp.client.ClientSession.request",
            side_effect=ConnectionResetError,
        ),
        pytest.raises(ConnectionErrorException),
    ):
        await mock_http_client.get("/test/json")
