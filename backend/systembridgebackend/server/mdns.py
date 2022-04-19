"""MDNS/Zeroconf Advertisement"""
import io
import re
import socket
import uuid

from plyer import uniqueid
from zeroconf import ServiceInfo, Zeroconf, InterfaceChoice

from systembridgebackend import Base
from systembridgebackend.settings import Settings, SETTING_PORT_API

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

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))

        fqdn = socket.getfqdn()
        hostname = socket.gethostname()
        ip4 = s.getsockname()[0]
        mac = ":".join(re.findall("..", "%012x" % uuid.getnode()))
        port_api = int(self._settings.get(SETTING_PORT_API))
        port_websocket = int(port_api)  # 9172
        id = uniqueid.id

        # Get version from version.txt
        with io.open("version.txt", encoding="utf-8") as f:
            version = f.read().splitlines()[0]

        zeroconf = Zeroconf(
            interfaces=InterfaceChoice.All,
            unicast=True,
        )

        info = ServiceInfo(
            ZEROCONF_TYPE,
            name=f"{id}.{ZEROCONF_TYPE}",
            server=f"{id}.local.",
            parsed_addresses=[ip4],
            port=port_api,
            properties={
                "address": f"http://{fqdn}:{port_api}",
                "fqdn": fqdn,
                "host": hostname,
                "ip": ip4,
                "mac": mac,
                "port": port_api,
                "uuid": id,
                "version": version,
                "websocketAddress": f"ws://{fqdn}:{port_websocket}",
                "wsPort": port_websocket,
            },
        )

        self._logger.debug("Advertise: %s", info)

        zeroconf.register_service(info, allow_name_change=True)
