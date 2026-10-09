"""Test the action model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.action import Action


def test_action(snapshot: SnapshotAssertion):
    """Test action."""
    action = Action(
        command="command",
        data={"key": "value"},
        label="label",
    )
    assert isinstance(action, Action)
    assert action == snapshot
