"""System Bridge: System"""
import os

from psutil import boot_time, getloadavg, users
from psutil._common import suser
from systembridgebackend import Base


class System(Base):
    """System"""

    def boot_time(self) -> float:
        """Get boot time"""
        return boot_time()

    def load_average(
        self,
    ) -> tuple[float, float, float]:  # pylint: disable=unsubscriptable-object
        """Get load average"""
        return getloadavg()

    def users(self) -> list[suser]:  # pylint: disable=unsubscriptable-object
        """Get users"""
        return users()
