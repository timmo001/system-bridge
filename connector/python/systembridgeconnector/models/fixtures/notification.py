"""Fixture for notification."""

from systembridgeconnector.models.notification import Action, Audio, Notification

FIXTURE_NOTIFICATION = Notification(
    title="Title",
    message="Message",
    icon="https://www.example.com/icon.png",
    image="https://www.example.com/image.png",
    actions=[
        Action(
            command="OPEN_URL",
            label="Open URL",
            data={"url": "https://www.example.com"},
        ),
        Action(
            command="OPEN_PATH",
            label="Open Path",
            data={"path": "/home/user/documents"},
        ),
    ],
    timeout=1000,
    audio=Audio(
        source="/home/user/notification.wav",
        volume=100,
    ),
    duration=1500,
    action_url="https://www.example.com/docs",
    action_path="/home/user/downloads",
    sound="/home/user/custom-notification.wav",
)
