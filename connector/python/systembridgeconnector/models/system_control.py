"""System Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class PowerProfileRequest:
    """A power profile, from the system module's power_profiles."""

    profile: str
