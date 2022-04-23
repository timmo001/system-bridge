"""System Bridge: Network"""
from psutil import net_connections, net_if_addrs, net_if_stats, net_io_counters
from psutil._common import sconn, snetio, snicaddr, snicstats
from systembridgeshared.base import Base


class Network(Base):
    """Network"""

    def connections(self) -> list[sconn]:  # pylint: disable=unsubscriptable-object
        """Connections"""
        return net_connections("all")

    def addresses(
        self,
    ) -> dict[str, list[snicaddr]]:  # pylint: disable=unsubscriptable-object
        """Addresses"""
        return net_if_addrs()

    def stats(self) -> dict[str, snicstats]:  # pylint: disable=unsubscriptable-object
        """Stats"""
        return net_if_stats()

    def io_counters(self) -> snetio:  # pylint: disable=unsubscriptable-object
        """IO Counters"""
        return net_io_counters()
