"""System Bridge GUI: Zeroconf"""
import asyncio
from argparse import Namespace
from typing import Callable, List
from zeroconf import ServiceStateChange
from zeroconf.asyncio import AsyncServiceBrowser, AsyncServiceInfo, Zeroconf

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

    async def add_service(
        self,
        zeroconf: Zeroconf,
        service_type: str,
        name: str,
    ) -> None:
        """Add service."""
        async_service_info = AsyncServiceInfo(service_type, name)
        await async_service_info.async_request(zeroconf, 3000)

        self.logger.info("Add service: %s", async_service_info)

        self.services.append(async_service_info)
        self.services_updated(self.services)

    def service_updated(
        self,
        zeroconf: Zeroconf,
        service_type: str,
        name: str,
        state_change: ServiceStateChange,
    ) -> None:
        """Service state changed."""
        print(f"Service {name} state changed: {state_change}")
        self.logger.debug(
            "Service Updated: type=%s name=%s state_change=%s",
            service_type,
            name,
            state_change,
        )

        if (
            state_change == ServiceStateChange.Added
            or state_change == ServiceStateChange.Updated
        ):
            for service in self.services:
                if service.name == name:
                    self.services.remove(service)
            asyncio.create_task(
                self.add_service(
                    zeroconf,
                    service_type,
                    name,
                )
            )

        elif state_change == ServiceStateChange.Removed:
            for service in self.services:
                if service.name == name:
                    self.services.remove(service)
            self.services_updated(self.services)
