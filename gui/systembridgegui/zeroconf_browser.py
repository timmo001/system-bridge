"""System Bridge GUI: Zeroconf"""
from argparse import Namespace
from typing import Callable, List
from zeroconf import Zeroconf, ServiceStateChange
from zeroconf.asyncio import AsyncServiceBrowser, AsyncServiceInfo

from .base import Base


class ZeroconfBrowser(Base):
    """Zeroconf Browser"""

    services: List[AsyncServiceInfo] = []

    def __init__(
        self,
        args: Namespace,
        services_updated: Callable[[List[AsyncServiceInfo]], None],
    ) -> None:
        """Initialize Zeroconf Browser"""
        super().__init__(args)

        self.services_updated = services_updated

        AsyncServiceBrowser(
            Zeroconf(),
            "_system-bridge._udp.local.",
            [self.service_updated],
        )

    def service_updated(
        self,
        zeroconf: Zeroconf,
        type: str,
        name: str,
        state_change: ServiceStateChange,
    ) -> None:
        """Service state changed."""
        print(f"Service {name} state changed: {state_change}")
        self.logger.debug(
            "Service Updated: type=%s name=%s state_change=%s",
            type,
            name,
            state_change,
        )

        # service_info = zeroconf.get_service_info(type, name)

        # if state_change == ServiceStateChange.Added:
        #     self.services.append(service_info)
        # elif state_change == ServiceStateChange.Updated:
        #     for service in self.services:
        #         if service.name == name:
        #             self.services.remove(service)
        #             self.services.append(service_info)
        # elif state_change == ServiceStateChange.Removed:
        #     for service in self.services:
        #         if service.name == name:
        #             self.services.remove(service)

        # self.services_updated(self.services)
