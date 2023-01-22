"""System Bridge Connector: HTTP Client"""
from __future__ import annotations

import asyncio
from typing import Any, Optional

import async_timeout
from aiohttp import ClientResponse, ClientSession
from aiohttp.client_exceptions import ClientConnectorError, ServerDisconnectedError

from .base import Base
from .exceptions import AuthenticationException, ConnectionErrorException

BASE_HEADERS = {
    "Accept": "application/json",
}


class HTTPClient(Base):
    """Client to handle API calls."""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        api_key: str,
        session: Optional[ClientSession] = None,
    ) -> None:
        """Initialize the client."""
        super().__init__()
        self._api_key = api_key
        self._base_url = f"http://{api_host}:{api_port}"
        self._session = session if session else ClientSession()

    async def delete(
        self,
        path: str,
        payload: Optional[Any],
    ) -> Any:
        """Make a DELETE request"""
        response: ClientResponse = await self.request(
            "DELETE",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "api-key": self._api_key,
            },
            json=payload,
        )
        return await response.json()

    async def get(
        self,
        path: str,
    ) -> Any:
        """Make a GET request"""
        response: ClientResponse = await self.request(
            "GET",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "api-key": self._api_key,
            },
        )
        if "application/json" in response.headers.get("Content-Type", ""):
            return await response.json()
        return await response.text()

    async def post(
        self,
        path: str,
        payload: Optional[Any],
    ) -> Any:
        """Make a POST request"""
        response: ClientResponse = await self.request(
            "POST",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "api-key": self._api_key,
            },
            json=payload,
        )
        return await response.json()

    async def put(
        self,
        path: str,
        payload: Optional[Any],
    ) -> Any:
        """Make a PUT request"""
        response: ClientResponse = await self.request(
            "PUT",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "api-key": self._api_key,
            },
            json=payload,
        )
        return await response.json()

    async def request(
        self,
        method: str,
        url: str,
        **kwargs,
    ) -> ClientResponse:
        """Make a request."""
        try:
            async with async_timeout.timeout(20):
                response: ClientResponse = await self._session.request(
                    method,
                    url,
                    **kwargs,
                )
            if response.status not in (200, 201, 202, 204):
                if response.status in (401, 403):
                    raise AuthenticationException(
                        {
                            "request": {
                                "method": method,
                                "url": url,
                            },
                            "response": await response.json(),
                            "status": response.status,
                        }
                    )
                raise ConnectionErrorException(
                    {
                        "request": {
                            "method": method,
                            "url": url,
                        },
                        "response": await response.json(),
                        "status": response.status,
                    }
                )
            return response
        except asyncio.TimeoutError as exception:
            raise ConnectionErrorException(
                {
                    "request": {
                        "method": method,
                        "url": url,
                    },
                    "status": "timeout",
                }
            ) from exception
        except (
            ClientConnectorError,
            ConnectionResetError,
            ServerDisconnectedError,
        ) as exception:
            raise ConnectionErrorException(
                {
                    "request": {
                        "method": method,
                        "url": url,
                    },
                    "status": "connection error",
                }
            ) from exception
