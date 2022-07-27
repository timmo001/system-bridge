"""System Bridge: Battery"""
from __future__ import annotations

from typing import Optional

from plyer import battery
import psutil
from systembridgeshared.base import Base


class Battery(Base):
    """Battery"""

    def sensors(self) -> Optional[psutil._common.sfan]:
        """Get battery sensors"""
        if not hasattr(psutil, "sensors_battery"):
            return None
        return psutil.sensors_battery()  # type: ignore

    def status(self) -> dict:
        """Get battery status"""
        return battery.status
