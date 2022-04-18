"""System Bridge: Server Authentication"""
from functools import wraps

from sanic import Sanic, exceptions
from systembridgebackend import Base


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
        self.form = None
        self.error = "Authentication required"
        self.token = None

        if app is not None:
            self.init_app(app)

    def init_app(self, app: Sanic):
        """Initialize"""
        app.register_middleware(self.open_session, "request")

    async def open_session(self, request):
        """Open session"""
        pass  # pylint: disable=unnecessary-pass

    async def _is_api_key(self, request):
        """Check key is valid api key"""
        if self.header:
            token = request.headers.get(self.header, None)
        elif self.form:
            if self.form in request.form:
                token = request.form[self.form][0]
            else:
                token = None
        else:
            if self.arg in request.args:
                token = request.args[self.arg][0]
            else:
                token = None

        self.token = token
        return token in self.api_keys

    def get_token(self):
        """Get logged api key"""
        return self.token if self.token else ""

    def add_key(self, key: str):
        """Add API Key"""
        self.api_keys.append(key)

    def key_required(self, handler=None):
        """Wrap handler with key check"""

        @wraps(handler)
        async def wrapper(request, *args, **kwargs):
            if not await self._is_api_key(request):
                # if hasattr(self.error, "__call__"):
                #     return await self.error(request)
                raise exceptions.Unauthorized(self.error)
            return await handler(request, *args, **kwargs)

        return wrapper
