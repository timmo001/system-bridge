"""System Bridge: Options"""
from collections import defaultdict

from sanic import Sanic, response
from sanic_routing.router import Route

from .cors import _add_cors_headers


def _compile_routes_needing_options(routes: dict[str, Route]) -> dict[str, frozenset]:
    """Compile a list of routes that need OPTIONS."""
    needs_options = defaultdict(list)
    for route in routes.values():
        if "OPTIONS" not in route.methods:
            needs_options[route.uri].extend(route.methods)

    return {uri: frozenset(methods) for uri, methods in dict(needs_options).items()}


def _options_wrapper(handler, methods):
    """Wrap a handler with CORS headers."""

    def wrapped_handler(request, *args, **kwargs):
        """Wrapper for handler."""
        nonlocal methods
        return handler(request, methods)

    return wrapped_handler


async def options_handler(_, methods) -> response.HTTPResponse:
    """Handle OPTIONS requests."""
    resp = response.empty()
    _add_cors_headers(resp, methods)
    return resp


def setup_options(app: Sanic, _):
    """Setup OPTIONS handlers."""
    app.router.reset()
    needs_options = _compile_routes_needing_options(app.router.routes_all)  # type: ignore
    for uri, methods in needs_options.items():
        app.add_route(
            _options_wrapper(options_handler, methods),
            uri,
            methods=["OPTIONS"],
        )
    app.router.finalize()
