"""System Bridge Shared: Exceptions"""


class AuthenticationException(BaseException):
    """Raise this when there is an authentication issue."""


class ConnectionClosedException(BaseException):
    """Raise this when connection is closed."""
