"""System Bridge Shared: Exceptions"""


class AuthenticationException(BaseException):
    """Raise this when there is an authentication issue."""


class ConnectionClosedException(BaseException):
    """Raise this when connection is closed."""


class ConnectionErrorException(BaseException):
    """Raise this when error connecting."""


class BadMessageException(BaseException):
    """Raise this when a bad message is sent."""
