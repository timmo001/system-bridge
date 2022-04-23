"""System Bridge: GUI"""
from logging import Logger
import os
import subprocess
import sys


async def start_gui(logger: Logger) -> None:
    """Start the GUI"""
    logger.info("Starting GUI")
    logger.info("Executable: %s", sys.executable)
    try:
        if "python" in sys.executable.lower():
            with subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "systembridgegui",
                ]
            ):
                logger.info("GUI started")
        else:
            with subprocess.Popen(
                [
                    os.path.join(
                        os.path.dirname(sys.executable),
                        f"systembridgegui{'.exe' if sys.platform == 'win32' else ''}",
                    )
                ]
            ):
                logger.info("GUI started")
    except Exception as exception:  # pylint: disable=broad-except
        logger.exception("Failed to start GUI: %s", exception)
