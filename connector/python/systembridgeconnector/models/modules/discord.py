"""Discord."""

from dataclasses import dataclass
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordUser:
    """Discord User."""

    id: str
    username: str
    global_name: str | None = None
    avatar_url: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordChannel:
    """Discord Channel."""

    id: str
    name: str
    type: str | None = None
    bitrate: int | None = None
    user_limit: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordServer:
    """Discord Server."""

    id: str
    name: str
    icon_url: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordVoiceConnection:
    """Discord Voice Connection."""

    state: str
    last_ping: float | None = None
    average_ping: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordCallMember:
    """Discord Call Member."""

    server_mute: bool
    server_deaf: bool
    suppress: bool
    speaking: bool
    nick: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordCall:
    """Discord Call."""

    channel: DiscordChannel
    server: DiscordServer | None = None
    connection: DiscordVoiceConnection | None = None
    me: DiscordCallMember | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.channel, dict):
            self.channel = DiscordChannel(**self.channel)

        if isinstance(self.server, dict):
            self.server = DiscordServer(**self.server)

        if isinstance(self.connection, dict):
            self.connection = DiscordVoiceConnection(**self.connection)

        if isinstance(self.me, dict):
            self.me = DiscordCallMember(**self.me)


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordDevice:
    """Discord Device."""

    id: str
    name: str


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordAudio:
    """Discord Audio."""

    volume: float | None = None
    device_id: str | None = None
    devices: list[DiscordDevice] | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.devices, list) and all(
            isinstance(item, dict) for item in self.devices
        ):
            new_devices: list[DiscordDevice] = []
            for d in self.devices:
                device: dict = cast(dict, d)
                new_devices.append(DiscordDevice(**device))
            self.devices = new_devices


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordVoiceMode:
    """Discord Voice Mode."""

    type: str | None = None
    auto_threshold: bool | None = None
    threshold: float | None = None
    delay: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class DiscordVoiceProcessing:
    """Discord Voice Processing."""

    noise_suppression: bool | None = None
    echo_cancellation: bool | None = None
    automatic_gain_control: bool | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Discord:
    """Discord."""

    connected: bool
    authenticated: bool
    user: DiscordUser | None = None
    call: DiscordCall | None = None
    mute: bool | None = None
    deaf: bool | None = None
    input: DiscordAudio | None = None
    output: DiscordAudio | None = None
    mode: DiscordVoiceMode | None = None
    processing: DiscordVoiceProcessing | None = None
    qos: bool | None = None
    silence_warning: bool | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.user, dict):
            self.user = DiscordUser(**self.user)

        if isinstance(self.call, dict):
            self.call = DiscordCall(**self.call)

        if isinstance(self.input, dict):
            self.input = DiscordAudio(**self.input)

        if isinstance(self.output, dict):
            self.output = DiscordAudio(**self.output)

        if isinstance(self.mode, dict):
            self.mode = DiscordVoiceMode(**self.mode)

        if isinstance(self.processing, dict):
            self.processing = DiscordVoiceProcessing(**self.processing)
