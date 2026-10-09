"""Fixture for system module."""

from systembridgeconnector.models.modules.system import (
    DeviceInfo,
    RunMode,
    System,
    SystemUser,
)

FIXTURE_SYSTEM = System(
    boot_time=1234,
    fqdn="hostname.local",
    hostname="hostname",
    kernel_version="6.1.0",
    ip_address_4="192.168.1.100",
    mac_address="00:00:00:00:00:00",
    platform_version="1.0.0",
    platform="platform",
    run_mode=RunMode.STANDALONE,
    uptime=1234,
    users=[
        SystemUser(
            name="username",
            active=True,
            terminal="terminal",
            host="host",
            started=1234,
            pid=1234,
        )
    ],
    uuid="uuid",
    version="1.0.0",
    camera_usage=[
        "camera1",
        "camera2",
    ],
    microphone_usage=[
        "microphone1",
        "microphone2",
    ],
    ip_address_6="::1",
    pending_reboot=True,
    version_latest_url="https://github.com/timmo001/system-bridge/releases/latest",
    version_latest="4.99.0",
    version_newer_available=True,
    device_info=DeviceInfo(
        manufacturer="manufacturer",
        model="model",
        version="version",
        board_vendor="board_vendor",
        board_name="board_name",
        bios_vendor="bios_vendor",
        bios_version="bios_version",
        chassis_type="chassis_type",
    ),
)
