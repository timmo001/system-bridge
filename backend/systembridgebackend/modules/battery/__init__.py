"""System Bridge: Battery"""
from __future__ import annotations

from typing import Optional

import psutil
from plyer import battery
from systembridgeshared.base import Base


class Battery(Base):
    """Battery"""

    def sensors(self) -> Optional[psutil._common.sbattery]:  # type: ignore
        """Get battery sensors"""
        if not hasattr(psutil, "sensors_battery"):
            return None
        return psutil.sensors_battery()  # type: ignore

    def status(self) -> Optional[dict]:
        """Get battery status"""
        try:
            return battery.status
        except ValueError:
            return None
