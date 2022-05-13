"""System Bridge: Server Authentication"""
from functools import wraps
from typing import Callable

from sanic import Sanic, exceptions
from systembridgeshared.base import Base


class ApiKeyAuthentication(Base):
    """ApiKey Authentication"""

    def __init__(
        self,
        app=None,
        arg="key",
        header=None,
        keys=None,
    ):
        """Initialize"""
        super().__init__()
        self.api_keys = keys
        self.header = header
        self.arg = arg
        self.error = "Authentication required"
        self.token = None

        if app is not None:
            self.init_app(app)

    def init_app(
        self,
        app: Sanic,
    ):
        """Initialize"""
        app.register_middleware(self.open_session, "request")

    async def open_session(self, request):
        """Open session"""
        pass  # pylint: disable=unnecessary-pass

    async def _is_api_key(self, request):
        """Check key is valid api key"""
        if not (token := request.headers.get(self.header, None)):
            token = request.args.get(self.arg, None)

        self.token = token
        return token in self.api_keys

    def get_token(self):
        """Get logged api key"""
        return self.token if self.token else ""

    def add_key(self, key: str):
        """Add API Key"""
        self.api_keys.append(key)

    def key_required(self, handler: Callable):
        """Wrap handler with key check"""

        @wraps(handler)
        async def wrapper(request, *args, **kwargs) -> Callable:
            if not await self._is_api_key(request):
                raise exceptions.Unauthorized(self.error)
            return await handler(request, *args, **kwargs)

        return wrapper
