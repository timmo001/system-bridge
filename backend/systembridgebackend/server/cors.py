"""System Bridge: CORS"""
from collections.abc import Iterable


def _add_cors_headers(response, methods: Iterable[str]) -> None:
    """Add CORS headers to a response."""
    allow_methods = list(set(methods))
    if "OPTIONS" not in allow_methods:
        allow_methods.append("OPTIONS")
    response.headers.extend(
        {
            "Access-Control-Allow-Methods": ",".join(allow_methods),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": (
                "accept, "
                "api-key, "
                "authorization, "
                "content-type, "
                "origin, "
                "x-request-id, "
                "x-xsrf-token"
            ),
        }
    )


def add_cors_headers(request, response):
    """Add CORS headers to a response."""
    if request.method != "OPTIONS":
        _add_cors_headers(response, list(request.route.methods))
