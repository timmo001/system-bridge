"""System Bridge"""
import logging


class Base:
    """Base"""

    def __init__(self):
        """Initialize"""
        self._logger = logging.getLogger(self.__class__.__name__)
        self._logger.debug("%s __init__", self.__class__.__name__)
