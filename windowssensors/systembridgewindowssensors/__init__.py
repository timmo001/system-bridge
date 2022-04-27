"""System Bridge Windows Sensors"""
import os

from systembridgeshared.base import Base


class WindowsSensors(Base):
    """Windows Sensors"""

    def get_path(self) -> str:
        """Get path (absolute)"""
        return os.path.abspath(
            os.path.join(
                os.path.dirname(__file__), "bin/SystemBridgeWindowsSensors.exe"
            ),
        )
