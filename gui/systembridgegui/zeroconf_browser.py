"""System Bridge GUI: Zeroconf"""
from argparse import Namespace
from typing import Callable, List
from zeroconf import ServiceBrowser, Zeroconf
from zeroconf._services import ServiceListener
from zeroconf._services.info import ServiceInfo

from .base import Base


class ZeroconfBrowser(Base):
    """Zeroconf Browser"""

    def __init__(
        self,
        args: Namespace,
        services_updated: Callable[[List[ServiceInfo]], None],
    ) -> None:
        """Initialize Zeroconf Browser"""
        super().__init__(args)

        ServiceBrowser(
            Zeroconf(),
            "_system-bridge._udp.local.",
            ZeroconfListener(args, services_updated),
        )


class ZeroconfListener(Base, ServiceListener):
    """Zeroconf Service Listener"""

    services: List[ServiceInfo] = []

    def __init__(
        self,
        args: Namespace,
        services_updated: Callable[[List[ServiceInfo]], None],
    ) -> None:
        """Initialize Zeroconf Listener"""
        super().__init__(args)

        self.services_updated = services_updated

    def add_service(
        self,
        zeroconf: Zeroconf,
        type: str,
        name: str,
    ) -> None:
        """Add service to list"""
        self.services.append(zeroconf.get_service_info(type, name))
        self.services_updated(self.services)

    def remove_service(
        self,
        zeroconf: Zeroconf,
        type: str,
        name: str,
    ) -> None:
        """Remove service from list"""
        for service in self.services:
            if service.name == name:
                self.services.remove(service)
                self.services_updated(self.services)

    def update_service(
        self,
        zeroconf: Zeroconf,
        type: str,
        name: str,
    ) -> None:
        """Update service in list"""
        for service in self.services:
            if service.name == name:
                self.services.remove(service)
                self.services.append(zeroconf.get_service_info(type, name))
                self.services_updated(self.services)
