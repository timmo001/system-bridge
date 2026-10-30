"""System Control."""

from dataclasses import dataclass
from enum import StrEnum


class PowerState(StrEnum):
    """What the host is about to do, or has just done."""

    SLEEPING = "sleeping"
    SHUTTING_DOWN = "shutting_down"
    RESUMED = "resumed"


@dataclass(slots=True)
class PowerProfileRequest:
    """A power profile, from the system module's power_profiles."""

    profile: str


@dataclass(slots=True)
class KeepAwakeRequest:
    """Whether to keep the system from idling.

    duration is the seconds until it may idle again. None keeps it awake until
    told otherwise.
    """

    enabled: bool
    duration: int | None = None


@dataclass(slots=True)
class PowerStateEvent:
    """The host is about to sleep or shut down, or has just woken.

    Sent to every client, whatever started it.
    """

    state: PowerState
