"""System Bridge: Sensors"""
# from psutil import (
#     sensors_battery,
#     sensors_fans,
#     sensors_temperatures,
# )
import psutil

from systembridgebackend import Base


class Sensors(Base):
    """Sensors"""

    def battery(self) -> dict:
        """Get battery"""
        return psutil.sensors_battery()

    def fans(self) -> dict:
        """Get fans"""
        return psutil.sensors_fans()

    def temperatures(self) -> dict:
        """Get temperatures"""
        return psutil.sensors_temperatures()
