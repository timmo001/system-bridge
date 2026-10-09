"""Discord Control."""

from dataclasses import dataclass
from enum import StrEnum


class DiscordAction(StrEnum):
    """Discord Action."""

    JOIN_VOICE_CHANNEL = "JOIN_VOICE_CHANNEL"
    LEAVE_VOICE_CHANNEL = "LEAVE_VOICE_CHANNEL"
    OPEN_TEXT_CHANNEL = "OPEN_TEXT_CHANNEL"
    MUTE = "MUTE"
    UNMUTE = "UNMUTE"
    TOGGLE_MUTE = "TOGGLE_MUTE"
    DEAFEN = "DEAFEN"
    UNDEAFEN = "UNDEAFEN"
    TOGGLE_DEAFEN = "TOGGLE_DEAFEN"
    SET_INPUT_VOLUME = "SET_INPUT_VOLUME"
    SET_INPUT_DEVICE = "SET_INPUT_DEVICE"
    SET_OUTPUT_VOLUME = "SET_OUTPUT_VOLUME"
    SET_OUTPUT_DEVICE = "SET_OUTPUT_DEVICE"
    SET_VOICE_MODE = "SET_VOICE_MODE"
    SET_VOICE_THRESHOLD = "SET_VOICE_THRESHOLD"
    SET_PUSH_TO_TALK_DELAY = "SET_PUSH_TO_TALK_DELAY"
    ENABLE_QOS = "ENABLE_QOS"
    DISABLE_QOS = "DISABLE_QOS"
    TOGGLE_QOS = "TOGGLE_QOS"
    ENABLE_SILENCE_WARNING = "ENABLE_SILENCE_WARNING"
    DISABLE_SILENCE_WARNING = "DISABLE_SILENCE_WARNING"
    TOGGLE_SILENCE_WARNING = "TOGGLE_SILENCE_WARNING"


class DiscordVoiceModeType(StrEnum):
    """Discord Voice Mode Type."""

    VOICE_ACTIVITY = "VOICE_ACTIVITY"
    PUSH_TO_TALK = "PUSH_TO_TALK"


@dataclass(slots=True)
class DiscordControl:
    """Discord Control.

    channel_id is for the channel actions, value for the volume, threshold and
    delay actions, device_id for the device actions and mode for SET_VOICE_MODE.
    """

    action: str
    channel_id: str | None = None
    value: float | None = None
    device_id: str | None = None
    mode: str | None = None
