"""Client keys: who a client is, and a key as it's handed out."""

from dataclasses import dataclass, field


@dataclass(slots=True)
class KeyClient:
    """A client with a key.

    The id is one the client keeps, so asking again replaces its key rather
    than adding another. The kind says what it is, such as home-assistant.
    """

    id: str
    name: str
    kind: str


@dataclass(slots=True)
class NewKey:
    """A key as it's handed out: the key, shown once, and its client."""

    key: str = field(repr=False)
    client: KeyClient

    def __post_init__(self) -> None:
        """Read the client from its JSON."""
        if isinstance(self.client, dict):
            self.client = KeyClient(**self.client)
