"""System Bridge: Sensors"""
from __future__ import annotations
import psutil

from systembridgebackend import Base


class Sensors(Base):
    """Sensors"""


    def fans(self) -> dict | None:
        """Get fans"""
        if not hasattr(psutil, "sensors_fans"):
            return None
        return psutil.sensors_fans()

    def temperatures(self) -> dict | None:
        """Get temperatures"""
        if not hasattr(psutil, "sensors_temperatures"):
            return None
        return psutil.sensors_temperatures()
