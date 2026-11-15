"""Client keys, to Groundwork's Client keys spec.

A key is ``<service>_<kind>_`` with 43 base62 random characters and a 6
character base62 CRC32 (IEEE) of everything before it. See
https://groundwork.timmo.dev/behavior (Client keys).
"""

from dataclasses import dataclass
import hashlib
import re
import zlib

SERVICE = "system-bridge"

_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
_CHECKSUM_LENGTH = 6
_KEY_PATTERN = re.compile(
    r"^([a-z][0-9a-z-]*)_([a-z][0-9a-z-]*)_([0-9A-Za-z]{43})([0-9A-Za-z]{6})$"
)


@dataclass(slots=True, frozen=True)
class ParsedKey:
    """A key read into its parts."""

    service: str
    kind: str
    random: str
    checksum: str


def _to_base62(value: int, length: int) -> str:
    """Return a number in base62, padded with zeros to a length."""
    text = ""
    while value > 0:
        value, digit = divmod(value, 62)
        text = _ALPHABET[digit] + text
    return text.rjust(length, "0")


def key_checksum(body: str) -> str:
    """Return the checksum for everything before it in a key."""
    return _to_base62(zlib.crc32(body.encode()), _CHECKSUM_LENGTH)


def parse_key(text: str) -> ParsedKey | None:
    """Read a key into its parts.

    Returns None when the text isn't shaped as a key or its checksum is
    wrong, so a mistyped key is turned away before it's sent.
    """
    if (match := _KEY_PATTERN.match(text)) is None:
        return None
    parsed = ParsedKey(*match.groups())
    if key_checksum(f"{parsed.service}_{parsed.kind}_{parsed.random}") != (
        parsed.checksum
    ):
        return None
    return parsed


def is_client_key(text: str) -> bool:
    """Return whether the text is a System Bridge key, not the old token."""
    return (parsed := parse_key(text)) is not None and parsed.service == SERVICE


def hash_key(key: str) -> str:
    """Return the lowercase hex SHA-256 of a key, the only form a service keeps."""
    return hashlib.sha256(key.encode()).hexdigest()
