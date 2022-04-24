"""System Bridge Shared: Base"""
import logging


class Base:  # pylint: disable=too-few-public-methods
    """Base"""

    def __init__(self):
        """Initialize"""
        name = f"{self.__module__}.{self.__class__.__name__}"
        self._logger = logging.getLogger(name)
        self._logger.debug("%s __init__", name)
