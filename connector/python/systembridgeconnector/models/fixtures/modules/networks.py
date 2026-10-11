"""Fixture for networks module."""

from systembridgeconnector.models.modules.networks import (
    Network,
    NetworkAddress,
    NetworkConnection,
    NetworkIO,
    Networks,
    NetworkStats,
)

FIXTURE_NETWORKS = Networks(
    connections=[
        NetworkConnection(
            fd=1,
            family=2,
            type=3,
            laddr="laddr",
            raddr="raddr",
            status="status",
            pid=4,
        )
    ],
    io=NetworkIO(
        bytes_sent=1,
        bytes_recv=2,
        packets_sent=3,
        packets_recv=4,
        errin=5,
        errout=6,
        dropin=7,
        dropout=8,
    ),
    networks=[
        Network(
            name="name",
            addresses=[
                NetworkAddress(
                    address="address",
                    netmask="netmask",
                    broadcast="broadcast",
                    ptp="ptp",
                )
            ],
            stats=NetworkStats(
                isup=True,
                duplex="duplex",
                speed=1,
                mtu=2,
                flags=[
                    "flag1",
                    "flag2",
                ],
            ),
        )
    ],
)
