"""System Bridge: Update Bridge"""
import time
from zeroconf import Zeroconf, ServiceStateChange

from systembridgebackend import Base
from systembridgebackend.common import COLUMN_TIMESTAMP
from systembridgebackend.database import Database
from systembridgebackend.modules.bridge import Bridge

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


class BridgeUpdate(Base):
    """Bridge Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__()

        self._database = database
        self._database.create_table(
            "bridge",
            [
                (COLUMN_UUID, "TEXT PRIMARY KEY"),
                (COLUMN_NAME, "TEXT"),
                (COLUMN_ADDRESS, "TEXT"),
                (COLUMN_FQDN, "TEXT"),
                (COLUMN_HOST, "TEXT"),
                (COLUMN_IP, "TEXT"),
                (COLUMN_MAC, "TEXT"),
                (COLUMN_PORT, "TEXT"),
                (COLUMN_VERSION, "TEXT"),
                (COLUMN_WEBSOCKET_ADDRESS, "TEXT"),
                (COLUMN_WEBSOCKET_PORT, "TEXT"),
                (COLUMN_ACTIVE, "INTEGER"),
                (COLUMN_LAST_ACTIVE_TIMESTAMP, "INTEGER"),
                (COLUMN_TIMESTAMP, "DOUBLE"),
            ],
        )
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
        if state_change == ServiceStateChange.Added:
            self.write_bridge(name, service_info.properties)
        elif state_change == ServiceStateChange.Removed:
            self.deactivate_bridge(name, service_info.properties)
        elif state_change == ServiceStateChange.Updated:
            self.write_bridge(name, service_info.properties)

    def deactivate_bridge(
        self,
        name: str,
        info: dict,
    ) -> None:
        """Deactivate bridge"""
        self._logger.info("Deactivate bridge %s", name)
        self._database.execute_sql(
            f"""UPDATE bridge SET {COLUMN_ACTIVE} = 0, {COLUMN_TIMESTAMP} = {time.time()}
             WHERE {COLUMN_UUID}={info[b"uuid"].decode("utf-8")}""".replace(
                "\n", ""
            ).replace(
                "            ", ""
            ),
        )

    def write_bridge(
        self,
        name: str,
        info: dict,
    ) -> None:
        """Write bridge"""
        values = {
            COLUMN_UUID: info[b"uuid"].decode("utf-8"),
            COLUMN_NAME: name,
            COLUMN_ADDRESS: info[b"address"].decode("utf-8"),
            COLUMN_FQDN: info[b"fqdn"].decode("utf-8"),
            COLUMN_HOST: info[b"host"].decode("utf-8"),
            COLUMN_IP: info[b"ip"].decode("utf-8"),
            COLUMN_MAC: info[b"mac"].decode("utf-8"),
            COLUMN_PORT: info[b"port"].decode("utf-8"),
            COLUMN_VERSION: info[b"version"].decode("utf-8"),
            COLUMN_WEBSOCKET_ADDRESS: info[b"websocketAddress"].decode("utf-8"),
            COLUMN_WEBSOCKET_PORT: info[b"wsPort"].decode("utf-8"),
            COLUMN_ACTIVE: 1,
            COLUMN_LAST_ACTIVE_TIMESTAMP: time.time(),
            COLUMN_TIMESTAMP: time.time(),
        }

        self._database.execute_sql(
            f"""INSERT INTO bridge ({COLUMN_UUID}, {COLUMN_NAME}, {COLUMN_ADDRESS}, {COLUMN_FQDN},
             {COLUMN_HOST}, {COLUMN_IP}, {COLUMN_MAC}, {COLUMN_PORT}, {COLUMN_VERSION},
             {COLUMN_WEBSOCKET_ADDRESS}, {COLUMN_WEBSOCKET_PORT}, {COLUMN_ACTIVE},
             {COLUMN_LAST_ACTIVE_TIMESTAMP}, {COLUMN_TIMESTAMP})
             VALUES("{values[COLUMN_UUID]}", "{values[COLUMN_NAME]}", "{values[COLUMN_ADDRESS]}",
             "{values[COLUMN_FQDN]}", "{values[COLUMN_HOST]}", "{values[COLUMN_IP]}",
             "{values[COLUMN_MAC]}", "{values[COLUMN_PORT]}", "{values[COLUMN_VERSION]}",
             "{values[COLUMN_WEBSOCKET_ADDRESS]}", "{values[COLUMN_WEBSOCKET_PORT]}",
             {values[COLUMN_ACTIVE]}, {values[COLUMN_LAST_ACTIVE_TIMESTAMP]},
             {values[COLUMN_TIMESTAMP]})
             ON CONFLICT({COLUMN_UUID}) DO
             UPDATE SET {COLUMN_ADDRESS} = "{values[COLUMN_ADDRESS]}",
             {COLUMN_FQDN} = "{values[COLUMN_FQDN]}", {COLUMN_HOST} = "{values[COLUMN_HOST]}",
             {COLUMN_IP} = "{values[COLUMN_IP]}", {COLUMN_MAC} = "{values[COLUMN_MAC]}",
             {COLUMN_PORT} = "{values[COLUMN_PORT]}",
             {COLUMN_VERSION} = "{values[COLUMN_VERSION]}",
             {COLUMN_WEBSOCKET_ADDRESS} = "{values[COLUMN_WEBSOCKET_ADDRESS]}",
             {COLUMN_WEBSOCKET_PORT} = "{values[COLUMN_WEBSOCKET_PORT]}",
             {COLUMN_ACTIVE} = {values[COLUMN_ACTIVE]},
             {COLUMN_LAST_ACTIVE_TIMESTAMP} = {values[COLUMN_LAST_ACTIVE_TIMESTAMP]},
             {COLUMN_TIMESTAMP} = {values[COLUMN_TIMESTAMP]}
             WHERE {COLUMN_UUID} = "{values[COLUMN_UUID]}"
            """.replace(
                "\n", ""
            ).replace(
                "            ", ""
            )
        )
