"""System Bridge: Base class"""
from argparse import Namespace
import logging


class Base:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.debug("%s __init__", self.__class__.__name__)
