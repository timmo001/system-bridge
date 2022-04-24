"""MDNS/Zeroconf Advertisement"""
import re
import socket
import uuid

from plyer import uniqueid
from systembridgeshared.base import Base
from systembridgeshared.settings import SETTING_PORT_API, Settings
from zeroconf import InterfaceChoice, ServiceInfo, Zeroconf

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

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))

        fqdn = socket.getfqdn()
        hostname = socket.gethostname()
        ip4 = sock.getsockname()[0]
        # pylint: disable=consider-using-f-string
        mac = ":".join(re.findall("..", "%012x" % uuid.getnode()))
        port_api = int(self._settings.get(SETTING_PORT_API))
        port_websocket = int(port_api)
        system_id = uniqueid.id

        # # Get version from version.txt
        # with io.open(
        #     os.path.join(os.path.dirname(__file__), f"../", "version.txt"),
        #     encoding="utf-8",
        # ) as file:
        #     version = file.read().splitlines()[0]
        version = "3.0.0"

        zeroconf = Zeroconf(
            interfaces=InterfaceChoice.All,
            unicast=True,
        )

        info = ServiceInfo(
            ZEROCONF_TYPE,
            name=f"{system_id}.{ZEROCONF_TYPE}",
            server=f"{system_id}.local.",
            parsed_addresses=[ip4],
            port=port_api,
            properties={
                "address": f"http://{fqdn}:{port_api}",
                "fqdn": fqdn,
                "host": hostname,
                "ip": ip4,
                "mac": mac,
                "port": port_api,
                "uuid": system_id,
                "version": version,
                "websocketAddress": f"ws://{fqdn}:{port_websocket}",
                "wsPort": port_websocket,
            },
        )

        self._logger.debug("Advertise: %s", info)

        zeroconf.register_service(info, allow_name_change=True)
