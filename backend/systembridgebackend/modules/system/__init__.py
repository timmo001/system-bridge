"""System Bridge: System"""
from psutil import boot_time, users
from psutil._common import suser
from systembridgeshared.base import Base


class System(Base):
    """System"""

    def boot_time(self) -> float:
        """Get boot time"""
        return boot_time()

    def users(self) -> list[suser]:  # pylint: disable=unsubscriptable-object
        """Get users"""
        return users()
