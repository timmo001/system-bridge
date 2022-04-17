"""System Bridge: Sensors"""
import psutil

from systembridgebackend import Base


class Sensors(Base):
    """Sensors"""

    def battery(self) -> dict:
        """Get battery"""
        if not hasattr(psutil, "sensors_battery"):
            return None
        return psutil.sensors_battery()

    def fans(self) -> dict:
        """Get fans"""
        if not hasattr(psutil, "sensors_fans"):
            return None
        return psutil.sensors_fans()

    def temperatures(self) -> dict:
        """Get temperatures"""
        if not hasattr(psutil, "sensors_temperatures"):
            return None
        return psutil.sensors_temperatures()
