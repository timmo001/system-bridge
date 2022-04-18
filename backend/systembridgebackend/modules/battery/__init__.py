"""System Bridge: Battery"""
from plyer import battery
from systembridgebackend import Base


class Battery(Base):
    """Battery"""

    def status(self) -> dict:
        """Get battery status"""
        return battery.status
