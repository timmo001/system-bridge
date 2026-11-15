"""HTTP Client."""

import asyncio
from dataclasses import asdict
from datetime import timedelta
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
from .models.keys import KeyClient, NewKey
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
        """Initialise the client.

        The token is this client's own key, or the old shared token until
        it's traded for one with exchange_key.
        """
        super().__init__()
        self._token = token
        self._base_url = f"http://{api_host}:{api_port}"
        self._session = session or ClientSession()

    @property
    def _headers(self) -> dict[str, str]:
        """Return the headers for a request, with the key."""
        return {**BASE_HEADERS, "Authorization": f"Bearer {self._token}"}

    async def delete(
        self,
        path: str,
        payload: Any | None,
    ) -> Any:
        """Make a DELETE request."""
        response: ClientResponse = await self.request(
            "DELETE",
            f"{self._base_url}{path}",
            headers=self._headers,
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
            headers=self._headers,
        )
        if "application/json" in response.headers.get("Content-Type", ""):
            return await response.json()
        return await response.text()

    async def exchange_key(self, client: KeyClient) -> NewKey:
        """Trade the old shared token for this client's own key.

        Keep the client's id, so exchanging again replaces its key rather
        than adding another. Use the key from then on, in place of the token.
        """
        return NewKey(
            **await self.post("/api/keys/exchange", {"client": asdict(client)})
        )

    async def media_file_url(
        self,
        base: str,
        path: str,
        expires_in: timedelta = timedelta(hours=24),
    ) -> str:
        """Return a URL for one media file, signed by System Bridge.

        It holds no key, so it can be given to another device, such as a
        cast device. System Bridge keeps it to 24 hours at most.
        """
        data = await self.post(
            "/api/media/file/url",
            {
                "base": base,
                "path": path,
                "expiresIn": int(expires_in.total_seconds()),
            },
        )
        return f"{self._base_url}{data['url']}"

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
            headers=self._headers,
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
            headers=self._headers,
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
