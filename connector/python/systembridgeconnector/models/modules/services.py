"""Services."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


class ServiceHealth(StrEnum):
    """Service Health, worst to best."""

    FAILED = "failed"
    MISSING = "missing"
    INACTIVE = "inactive"
    STALE = "stale"
    DEGRADED = "degraded"
    WARNING = "warning"
    RUNNING = "running"
    PAUSED = "paused"
    OK = "ok"


class ServiceStatKind(StrEnum):
    """Service Stat Kind."""

    DURATION = "duration"
    SIZE = "size"
    TIMESTAMP = "timestamp"
    COUNT = "count"


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceProvider:
    """Service Provider.

    updated is when its last good read finished, in Unix milliseconds. error
    is why its last read failed, or None when it worked.
    """

    id: str
    updated: int | None = None
    error: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceStat:
    """Service Stat."""

    id: str
    label: str
    value: float | str
    unit: str | None = None
    kind: ServiceStatKind | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceListItem:
    """Service List Item."""

    label: str
    value: str


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceList:
    """Service List."""

    id: str
    label: str
    items: list[ServiceListItem] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.items = [
            ServiceListItem(**cast(dict, i)) if isinstance(i, dict) else i
            for i in self.items or []
        ]


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceAction:
    """Service Action.

    confirm is a question to ask before running it. disabled is why it can't
    run now.
    """

    id: str
    label: str
    confirm: str | None = None
    disabled: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceItem:
    """Service Item. Times are in Unix milliseconds."""

    provider: str
    id: str
    label: str
    kind: str
    health: ServiceHealth
    busy: bool = False
    summary: str | None = None
    last_run: int | None = None
    last_success: int | None = None
    next_run: int | None = None
    progress: float | None = None
    stats: list[ServiceStat] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    lists: list[ServiceList] = field(default_factory=list)
    actions: list[ServiceAction] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.stats = [
            ServiceStat(**cast(dict, s)) if isinstance(s, dict) else s
            for s in self.stats or []
        ]
        self.notes = list(self.notes or [])
        self.lists = [
            ServiceList(**cast(dict, i)) if isinstance(i, dict) else i
            for i in self.lists or []
        ]
        self.actions = [
            ServiceAction(**cast(dict, a)) if isinstance(a, dict) else a
            for a in self.actions or []
        ]


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceBusy:
    """Service Busy, with since in Unix milliseconds."""

    provider: str
    item: str
    label: str
    since: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceError:
    """Service Error, a problem a provider reported."""

    provider: str
    source: str
    message: str


@filter_unexpected_fields
@dataclass(slots=True)
class Services:
    """Services.

    A provider that failed keeps its earlier items, marked stale, and its busy
    list, with its error in providers.
    """

    providers: list[ServiceProvider] = field(default_factory=list)
    items: list[ServiceItem] = field(default_factory=list)
    busy: list[ServiceBusy] = field(default_factory=list)
    errors: list[ServiceError] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.providers = [
            ServiceProvider(**cast(dict, p)) if isinstance(p, dict) else p
            for p in self.providers or []
        ]
        self.items = [
            ServiceItem(**cast(dict, i)) if isinstance(i, dict) else i
            for i in self.items or []
        ]
        self.busy = [
            ServiceBusy(**cast(dict, b)) if isinstance(b, dict) else b
            for b in self.busy or []
        ]
        self.errors = [
            ServiceError(**cast(dict, e)) if isinstance(e, dict) else e
            for e in self.errors or []
        ]
