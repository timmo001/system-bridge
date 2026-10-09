"""Test the exceptions module."""

from systembridgeconnector.exceptions import (
    AuthenticationException,
    BadMessageException,
    BadRequestException,
    ConnectionClosedException,
    ConnectionErrorException,
)


def test_authentication_exception():
    """Test the AuthenticationException."""
    exception = AuthenticationException("Test")
    assert exception is not None
    assert str(exception) == "Test"


def test_bad_message_exception():
    """Test the BadMessageException."""
    exception = BadMessageException("Test")
    assert exception is not None
    assert str(exception) == "Test"


def test_bad_request_exception():
    """Test the BadRequestException."""
    exception = BadRequestException("Test")
    assert exception is not None
    assert str(exception) == "Test"


def test_connection_closed_exception():
    """Test the ConnectionClosedException."""
    exception = ConnectionClosedException("Test")
    assert exception is not None
    assert str(exception) == "Test"


def test_connection_error_exception():
    """Test the ConnectionErrorException."""
    exception = ConnectionErrorException("Test")
    assert exception is not None
    assert str(exception) == "Test"
