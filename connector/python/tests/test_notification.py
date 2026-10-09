"""Test the OpenPath model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.notification import FIXTURE_NOTIFICATION
from systembridgeconnector.models.notification import Action, Audio, Notification


def test_notification(snapshot: SnapshotAssertion):
    """Test the notification."""
    notification = FIXTURE_NOTIFICATION
    assert isinstance(notification, Notification)
    assert notification == snapshot


def test_notification_dict(snapshot: SnapshotAssertion):
    """Test notification dict."""
    notification_dict = asdict(FIXTURE_NOTIFICATION)
    assert isinstance(notification_dict, dict)
    assert notification_dict == snapshot

    notification_converted = Notification(**notification_dict)
    assert isinstance(notification_converted, Notification)
    assert notification_converted == snapshot(
        name="notification-dict-converted",
    )


def test_notification_payload(snapshot: SnapshotAssertion):
    """Test notification payload conversion."""
    notification_payload = FIXTURE_NOTIFICATION.to_payload()
    assert isinstance(notification_payload, dict)
    assert notification_payload == snapshot


def test_notification_payload_legacy_support(snapshot: SnapshotAssertion):
    """Test notification payload conversion for legacy fields."""
    notification = Notification(
        title="Title",
        message="Message",
        actions=[
            Action(
                command="OPEN_URL",
                label="Open URL",
                data={"url": "https://example.com"},
            ),
            Action(
                command="OPEN_PATH",
                label="Open Path",
                data={"path": "/home/user/documents"},
            ),
        ],
        timeout=2500,
        audio=Audio(source="/home/user/notify.wav"),
    )

    assert notification.to_payload() == snapshot
