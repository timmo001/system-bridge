"""System Control."""

from dataclasses import dataclass


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
