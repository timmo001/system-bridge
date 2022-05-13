"""MDNS/Zeroconf Advertisement"""
from systembridgeshared.base import Base
from systembridgeshared.settings import SETTING_PORT_API, Settings
from zeroconf import InterfaceChoice, ServiceInfo, Zeroconf

from systembridgebackend.modules.system import System

ZEROCONF_TYPE = "_system-bridge._tcp.local."


class MDNSAdvertisement(Base):
    """MDNS/Zeroconf Advertisement"""

    def __init__(
        self,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._settings = settings

    def advertise_server(self) -> None:
        """Advertise server"""

        system = System()

        fqdn = system.fqdn()
        hostname = system.hostname()
        ip_address_4 = system.ip_address_4()
        mac_address = system.mac_address()
        port_api = self._settings.get(SETTING_PORT_API)
        system_id = system.uuid()

        if not port_api:
            raise ValueError("Port API not set")

        zeroconf = Zeroconf(
            interfaces=InterfaceChoice.All,
            unicast=True,
        )

        info = ServiceInfo(
            ZEROCONF_TYPE,
            name=f"{system_id}.{ZEROCONF_TYPE}",
            server=f"{system_id}.local.",
            parsed_addresses=[ip_address_4],
            port=int(port_api),
            properties={
                "address": f"http://{fqdn}:{port_api}",
                "fqdn": fqdn,
                "host": hostname,
                "ip": ip_address_4,
                "mac": mac_address,
                "port": port_api,
                "uuid": system_id,
                "version": system.version,
                "websocketAddress": f"ws://{fqdn}:{port_api}/api/websocket",
            },
        )

        self._logger.debug("Advertise: %s", info)

        zeroconf.register_service(info, allow_name_change=True)
