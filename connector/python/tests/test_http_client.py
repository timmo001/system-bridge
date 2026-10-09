"""Test the http client module."""

import asyncio
from unittest.mock import patch

import pytest

from systembridgeconnector.exceptions import (
    AuthenticationException,
    BadRequestException,
    ConnectionErrorException,
)
from systembridgeconnector.http_client import HTTPClient


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
