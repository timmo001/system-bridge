"""Test the version check."""

from unittest.mock import AsyncMock, patch

import pytest

from systembridgeconnector.version import Version

from . import API_HOST


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("version", "supported"),
    [
        pytest.param("5.28.5", False, id="before keys"),
        pytest.param("5.28.6.dev7536+g323f78f", True, id="development build with keys"),
        pytest.param("5.28.6.r7536.g323f78f", True, id="package build with keys"),
        pytest.param("unknown", False, id="no version"),
        pytest.param("5.29.0", True, id="release with keys"),
    ],
)
async def test_check_supported(version: str, supported: bool) -> None:
    """Test the version comes from the health route and needs keys."""
    with patch(
        "systembridgeconnector.http_client.HTTPClient.get_health",
        AsyncMock(return_value={"status": "healthy", "version": version}),
    ) as get_health:
        assert await Version(API_HOST, 9170, "").check_supported() is supported
    get_health.assert_awaited_once()
