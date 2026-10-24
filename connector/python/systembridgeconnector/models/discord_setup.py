"""Discord Setup."""

from dataclasses import dataclass


class RedactedStr(str):
    """A string that sends as itself but never shows in logs or reprs."""

    __slots__ = ()

    def __repr__(self) -> str:
        """Hide the value."""
        return "<redacted>"


@dataclass(slots=True)
class DiscordSetup:
    """How far Discord is set up. The backend never sends the client secret back.

    redirectUri must be registered as a redirect on the Discord application,
    running is whether the Discord desktop app can be reached, and error is the
    latest problem with the credentials or the session, or empty.
    """

    configured: bool
    clientId: str  # noqa: N815
    redirectUri: str  # noqa: N815
    running: bool
    connected: bool
    authenticated: bool
    error: str = ""
