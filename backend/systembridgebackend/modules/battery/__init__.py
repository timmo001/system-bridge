"""System Bridge: Battery"""
from __future__ import annotations

from plyer import battery
import psutil
from systembridgeshared.base import Base


class Battery(Base):
    """Battery"""

    def sensors(self) -> psutil._common.sfan | None:
        """Get battery sensors"""
        if not hasattr(psutil, "sensors_battery"):
            return None
        return psutil.sensors_battery()

    def status(self) -> dict:
        """Get battery status"""
        return battery.status
