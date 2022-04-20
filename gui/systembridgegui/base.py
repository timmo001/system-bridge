"""System Bridge GUI: Base"""
import logging
from argparse import Namespace


class Base:
    """Base"""

    def __init__(
        self,
        args: Namespace,
    ):
        """Initialize"""
        self.args = args
        self._logger = logging.getLogger(self.__class__.__name__)
        self._logger.debug("%s __init__", self.__class__.__name__)
