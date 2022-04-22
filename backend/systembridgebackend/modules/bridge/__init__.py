"""System Bridge: Bridge"""
from zeroconf import Zeroconf, ServiceBrowser, InterfaceChoice

from systembridgeshared.base import Base


class Bridge(Base):
    """Bridge"""

    def __init__(
        self,
        callback: callable,
    ):
        super().__init__()
        ServiceBrowser(
            Zeroconf(
                interfaces=InterfaceChoice.All,
                unicast=True,
            ),
            [
                "_system-bridge._tcp.local.",
                "_system-bridge._udp.local.",
            ],
            handlers=[callback],
        )
