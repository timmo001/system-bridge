"""System Bridge: Memory"""
from collections import namedtuple
from psutil import (
    swap_memory,
    virtual_memory,
)
from psutil._common import sswap

from systembridgebackend import Base


class Memory(Base):
    """Memory"""

    def swap_memory(self) -> sswap:
        """Swap memory"""
        return swap_memory()

    def virtual_memory(self) -> namedtuple:  # svmem:
        """Virtual memory"""
        return virtual_memory()
