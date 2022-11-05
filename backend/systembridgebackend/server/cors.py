"""System Bridge: CORS"""
from collections.abc import Iterable


def _add_cors_headers(response, methods: Iterable[str]) -> None:
    """Add CORS headers to a response."""
    allow_methods = list(set(methods))
    if "DELETE" not in allow_methods:
        allow_methods.append("DELETE")
    if "OPTIONS" not in allow_methods:
        allow_methods.append("OPTIONS")
    response.headers.extend(
        {
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": ",".join(allow_methods),
            "Access-Control-Allow-Headers": ",".join(
                [
                    "accept",
                    "api-key",
                    "authorization",
                    "content-type",
                    "origin",
                    "x-request-id",
                    "x-xsrf-token",
                ]
            ),
            "Access-Control-Allow-Origin": "*",
        }
    )


def add_cors_headers(request, response):
    """Add CORS headers to a response."""
    if request.method != "OPTIONS":
        _add_cors_headers(
            response, list(request.route.methods) if request.route is not None else []
        )
