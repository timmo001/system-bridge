"""System Bridge: Network"""
from psutil import (
    net_connections,
    net_if_addrs,
    net_if_stats,
    net_io_counters,
)
from psutil._common import sconn, snicaddr, snicstats, snetio

from systembridgebackend import Base


class Network(Base):
    """Network"""

    def connections(self) -> list[sconn]:
        """Connections"""
        return net_connections("all")

    def addresses(self) -> dict[str, list[snicaddr]]:
        """Addresses"""
        return net_if_addrs()

    def stats(self) -> dict[str, snicstats]:
        """Stats"""
        return net_if_stats()

    def io_counters(self) -> snetio:
        """IO Counters"""
        return net_io_counters()
