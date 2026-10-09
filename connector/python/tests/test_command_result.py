"""Test the command result model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.command_result import ExecuteResult


def test_execute_result(snapshot: SnapshotAssertion):
    """Test the execute result."""
    execute_result = ExecuteResult(
        commandID="test-command-id",
        exitCode=0,
        stdout="Command output",
        stderr="",
        error=None,
    )
    assert isinstance(execute_result, ExecuteResult)
    assert execute_result.commandID == "test-command-id"
    assert execute_result.exitCode == 0
    assert execute_result.stdout == "Command output"
    assert execute_result.stderr == ""
    assert execute_result.error is None
    assert execute_result == snapshot


def test_execute_result_with_error(snapshot: SnapshotAssertion):
    """Test the execute result with error."""
    execute_result = ExecuteResult(
        commandID="test-command-id",
        exitCode=1,
        stdout="",
        stderr="Error occurred",
        error="Command failed",
    )
    assert isinstance(execute_result, ExecuteResult)
    assert execute_result.commandID == "test-command-id"
    assert execute_result.exitCode == 1
    assert execute_result.stdout == ""
    assert execute_result.stderr == "Error occurred"
    assert execute_result.error == "Command failed"
    assert execute_result == snapshot


def test_execute_result_with_stderr(snapshot: SnapshotAssertion):
    """Test the execute result with stderr."""
    execute_result = ExecuteResult(
        commandID="test-command-id",
        exitCode=0,
        stdout="Output",
        stderr="Warning message",
        error=None,
    )
    assert isinstance(execute_result, ExecuteResult)
    assert execute_result.stderr == "Warning message"
    assert execute_result == snapshot
