"""System Bridge: Update Bridge"""
import time

from systembridgeshared.database import Database
from systembridgeshared.models.database_data_bridge import Bridge as DatabaseModel
from zeroconf import ServiceStateChange, Zeroconf

from . import Bridge
from ..base import ModuleUpdateBase

COLUMN_NAME = "name"
COLUMN_ADDRESS = "address"
COLUMN_FQDN = "fqdn"
COLUMN_HOST = "host"
COLUMN_IP = "ip"
COLUMN_MAC = "mac"
COLUMN_PORT = "port"
COLUMN_UUID = "uuid"
COLUMN_VERSION = "version"
COLUMN_WEBSOCKET_ADDRESS = "websocket_address"
COLUMN_WEBSOCKET_PORT = "websocket_port"
COLUMN_ACTIVE = "active"
COLUMN_LAST_ACTIVE_TIMESTAMP = "last_active_timestamp"


class BridgeUpdate(ModuleUpdateBase):
    """Bridge Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._bridge = Bridge(self.service_changed)

    def service_changed(
        self,
        zeroconf: Zeroconf,
        service_type: str,
        name: str,
        state_change: ServiceStateChange,
    ) -> None:
        """Service changed"""
        self._logger.info(
            "service_changed: type=%s name=%s state_change=%s",
            service_type,
            name,
            state_change,
        )
        service_info = zeroconf.get_service_info(service_type, name)
        self._logger.info(
            "Service %s %s: %s - %s", name, state_change, service_type, service_info
        )
        if service_info and service_info.properties:
            self._database.add_data(
                DatabaseModel(
                    uuid=service_info.properties[b"uuid"].decode("utf-8"),
                    name=name,
                    address=service_info.properties[b"address"].decode("utf-8"),
                    fqdn=service_info.properties[b"fqdn"].decode("utf-8"),
                    host=service_info.properties[b"host"].decode("utf-8"),
                    ip=service_info.properties[b"ip"].decode("utf-8"),
                    mac=service_info.properties[b"mac"].decode("utf-8"),
                    port=service_info.properties[b"port"].decode("utf-8"),
                    version=service_info.properties[b"version"].decode("utf-8"),
                    websocket_address=service_info.properties[
                        b"websocketAddress"
                    ].decode("utf-8"),
                    websocket_port=service_info.properties[b"wsPort"].decode("utf-8"),
                    active=1
                    if state_change
                    in (ServiceStateChange.Added, ServiceStateChange.Updated)
                    else 0,
                    last_active_timestamp=time.time(),
                    timestamp=time.time(),
                )
            )
