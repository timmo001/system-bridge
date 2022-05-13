"""System Bridge: Disk"""
from __future__ import annotations

from typing import NamedTuple

from psutil import disk_io_counters, disk_partitions, disk_usage
from psutil._common import sdiskio, sdiskpart
from systembridgeshared.base import Base


class Disk(Base):
    """Disk"""

    def io_counters(self) -> sdiskio:
        """Disk IO counters"""
        return disk_io_counters()

    def io_counters_per_disk(self) -> sdiskio:
        """Disk IO counters per disk"""
        return disk_io_counters(perdisk=True)

    def partitions(self) -> list[sdiskpart]:
        """Disk partitions"""
        return disk_partitions(all=True)

    def usage(self, path: str) -> NamedTuple | None:
        """Disk usage"""
        try:
            return disk_usage(path)
        except PermissionError as error:
            self._logger.error("PermissionError: %s", error)
            return None
