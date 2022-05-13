"""System Bridge: Bridge"""
from collections.abc import Callable

from systembridgeshared.base import Base
from zeroconf import InterfaceChoice, ServiceBrowser, Zeroconf


class Bridge(Base):
    """Bridge"""

    def __init__(
        self,
        callback: Callable,
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
