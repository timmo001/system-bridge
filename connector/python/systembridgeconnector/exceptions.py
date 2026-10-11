"""Exceptions."""


class AuthenticationException(BaseException):
    """Raise this when there is an authentication issue."""


class BadMessageException(BaseException):
    """Raise this when a bad message is sent."""


class BadRequestException(BaseException):
    """Raise this when a bad request is sent."""


class ConnectionClosedException(BaseException):
    """Raise this when connection is closed."""


class ConnectionErrorException(BaseException):
    """Raise this when error connecting."""


class DataMissingException(BaseException):
    """Raise this when data is missing."""
