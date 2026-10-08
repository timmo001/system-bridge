"""Networks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from ..helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class NetworkAddress:
    """Network Address."""

    address: str | None = None
    family: str | None = None
    netmask: str | None = None
    broadcast: str | None = None
    ptp: str | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class NetworkStats:
    """Network Stats."""

    isup: bool | None = None
    duplex: str | None = None
    speed: int | None = None
    mtu: int | None = None
    flags: list[str] | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class NetworkConnection:
    """Network Connection."""

    fd: int | None = None
    family: int | None = None
    type: int | None = None
    laddr: str | None = None
    raddr: str | None = None
    status: str | None = None
    pid: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class NetworkIO:
    """Network IO."""

    bytes_sent: int | None = None
    bytes_recv: int | None = None
    packets_sent: int | None = None
    packets_recv: int | None = None
    errin: int | None = None
    errout: int | None = None
    dropin: int | None = None
    dropout: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Network:
    """Network."""

    name: str | None = None
    addresses: list[NetworkAddress] | None = None
    stats: NetworkStats | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.addresses, list) and all(
            isinstance(item, dict) for item in self.addresses
        ):
            new_addresses: list[NetworkAddress] = []
            for a in self.addresses:
                address: dict = cast(dict, a)
                new_addresses.append(NetworkAddress(**address))
            self.addresses = new_addresses

        if isinstance(self.stats, dict):
            stats = self.stats
            self.stats = NetworkStats(**stats)


@filter_unexpected_fields
@dataclass(slots=True)
class Networks:
    """Networks."""

    connections: list[NetworkConnection] | None = None
    io: NetworkIO | None = None
    networks: list[Network] | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.connections, list) and all(
            isinstance(item, dict) for item in self.connections
        ):
            new_connections: list[NetworkConnection] = []
            for c in self.connections:
                connection: dict = cast(dict, c)
                new_connections.append(NetworkConnection(**connection))
            self.connections = new_connections

        if isinstance(self.io, dict):
            io = self.io
            self.io = NetworkIO(**io)

        if isinstance(self.networks, list) and all(
            isinstance(item, dict) for item in self.networks
        ):
            new_networks: list[Network] = []
            for n in self.networks:
                network: dict = cast(dict, n)
                new_networks.append(Network(**network))
            self.networks = new_networks
