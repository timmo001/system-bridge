"""System Bridge"""
import logging

from systembridgebackend.main import Main

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

if __name__ == "__main__":
    logging.basicConfig(
        format=FORMAT,
        datefmt=DATE_FORMAT,
        level="DEBUG",
    )
    logger = logging.getLogger(__name__)

    Main()
