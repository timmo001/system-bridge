"""System Bridge: Memory"""
from typing import NamedTuple

from psutil import swap_memory, virtual_memory
from psutil._common import sswap
from systembridgeshared.base import Base


class Memory(Base):
    """Memory"""

    def swap(self) -> sswap:
        """Swap memory"""
        return swap_memory()

    def virtual(self) -> NamedTuple:  # svmem:
        """Virtual memory"""
        return virtual_memory()
