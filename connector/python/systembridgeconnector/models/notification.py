"""Notification."""

from dataclasses import asdict, dataclass
from typing import Any, cast


@dataclass(slots=True)
class Action:
    """Notification Action."""

    command: str
    label: str
    data: dict[str, Any] | None = None


@dataclass(slots=True)
class Audio:
    """Notification Audio."""

    source: str
    volume: float | None = None


@dataclass(slots=True)
class Notification:
    """Notification."""

    title: str
    message: str | None = None
    icon: str | None = None
    image: str | None = None
    actions: list[Action] | None = None
    timeout: float | None = None
    audio: Audio | None = None
    duration: int | None = None
    action_url: str | None = None
    action_path: str | None = None
    sound: str | None = None

    def __post_init__(self):
        """Post init."""
        if isinstance(self.actions, list) and all(
            isinstance(item, dict) for item in self.actions
        ):
            new_actions: list[Action] = []
            for a in self.actions:
                action = cast(dict, a)
                new_actions.append(Action(**action))
            self.actions = new_actions

        if isinstance(self.audio, dict):
            audio = cast(dict, self.audio)
            self.audio = Audio(**audio)

    def to_payload(self) -> dict[str, Any]:
        """Convert notification to API payload."""
        payload: dict[str, Any] = {
            "title": self.title,
        }

        if self.message is not None:
            payload["message"] = self.message
        if self.icon is not None:
            payload["icon"] = self.icon
        if self.image is not None:
            payload["image"] = self.image
        if self.actions is not None:
            payload["actions"] = [asdict(action) for action in self.actions]
        if self.timeout is not None:
            payload["timeout"] = self.timeout
        if self.audio is not None:
            payload["audio"] = asdict(self.audio)

        duration = self.duration
        if duration is None and self.timeout is not None:
            duration = int(self.timeout)
        if duration is not None:
            payload["duration"] = duration

        action_url = self.action_url
        action_path = self.action_path

        if action_url is None or action_path is None:
            for action in self.actions or []:
                action_data = action.data or {}
                command = action.command.upper()

                if (
                    action_url is None
                    and command == "OPEN_URL"
                    and isinstance(action_data.get("url"), str)
                ):
                    action_url = action_data["url"]

                if (
                    action_path is None
                    and command == "OPEN_PATH"
                    and isinstance(action_data.get("path"), str)
                ):
                    action_path = action_data["path"]

        if action_url is not None:
            payload["actionUrl"] = action_url
        if action_path is not None:
            payload["actionPath"] = action_path

        sound = self.sound
        if sound is None and self.audio is not None:
            sound = self.audio.source
        if sound is not None:
            payload["sound"] = sound

        return payload
