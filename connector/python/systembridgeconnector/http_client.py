"""HTTP Client."""

import asyncio
from typing import Any

from aiohttp import ClientResponse, ClientSession
from aiohttp.client_exceptions import ClientConnectorError, ServerDisconnectedError

from .base import Base
from .const import MODEL_MAP, Model
from .exceptions import (
    AuthenticationException,
    BadRequestException,
    ConnectionErrorException,
)
from .models.modules import Module

BASE_HEADERS = {
    "Accept": "application/json",
}


class HTTPClient(Base):
    """Client to handle API calls."""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        token: str,
        session: ClientSession | None = None,
    ) -> None:
        """Initialise the client."""
        super().__init__()
        self._token = token
        self._base_url = f"http://{api_host}:{api_port}"
        self._session = session or ClientSession()

    async def delete(
        self,
        path: str,
        payload: Any | None,
    ) -> Any:
        """Make a DELETE request."""
        response: ClientResponse = await self.request(
            "DELETE",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "token": self._token,
            },
            json=payload,
        )
        return await response.json()

    async def get(
        self,
        path: str,
    ) -> Any:
        """Make a GET request."""
        response: ClientResponse = await self.request(
            "GET",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "token": self._token,
            },
        )
        if "application/json" in response.headers.get("Content-Type", ""):
            return await response.json()
        return await response.text()

    async def get_health(self) -> dict[str, Any]:
        """Get the backend health: status, timestamp and version."""
        return await self.get("/api/health")

    async def get_module_data(self, module: Module) -> Any:
        """Get the latest data for a module, mapped to its model."""
        data = await self.get(f"/api/data/{module}")
        model_cls = MODEL_MAP[Model(module)]
        if isinstance(data, list):
            return [model_cls(**item) for item in data]
        return model_cls(**data)

    async def post(
        self,
        path: str,
        payload: Any | None,
    ) -> Any:
        """Make a POST request."""
        response: ClientResponse = await self.request(
            "POST",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "token": self._token,
            },
            json=payload,
        )
        return await response.json()

    async def put(
        self,
        path: str,
        payload: Any | None,
    ) -> Any:
        """Make a PUT request."""
        response: ClientResponse = await self.request(
            "PUT",
            f"{self._base_url}{path}",
            headers={
                **BASE_HEADERS,
                "token": self._token,
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
            async with asyncio.timeout(20):
                response: ClientResponse = await self._session.request(
                    method,
                    url,
                    **kwargs,
                )
            if response.status not in (200, 201, 202, 204):
                if response.status == 400:
                    raise BadRequestException(
                        {
                            "request": {
                                "method": method,
                                "url": url,
                            },
                            "response": await response.json(),
                            "status": response.status,
                        }
                    )
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
                        "status": response.status,
                    }
                )
        except TimeoutError as exception:
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
        return response
