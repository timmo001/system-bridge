"""Fixture for battery module."""

from systembridgeconnector.models.modules.battery import (
    Battery,
    BatteryInfo,
    BatteryScope,
    BatteryState,
)

FIXTURE_BATTERY = Battery(
    is_charging=True,
    percentage=98.4,
    time_remaining=12,
    state=BatteryState.CHARGING,
    power=25.5,
    voltage=12.6,
    ac_connected=True,
    batteries=[
        BatteryInfo(
            name="BAT0",
            model="model",
            scope=BatteryScope.SYSTEM,
            state=BatteryState.CHARGING,
            percentage=98.4,
            time_remaining=12,
            power=25.5,
            voltage=12.6,
        ),
        BatteryInfo(
            name="hidpp_battery_1",
            model="mouse",
            serial="9b-9a-d4-1b",
            scope=BatteryScope.DEVICE,
            state=BatteryState.DISCHARGING,
            percentage=96,
        ),
    ],
)
