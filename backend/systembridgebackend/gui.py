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
            subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "systembridgegui",
                ]
            )
        else:
            subprocess.Popen(
                [
                    os.path.join(
                        os.path.dirname(sys.executable),
                        f"systembridgegui{'.exe' if sys.platform == 'win32' else ''}",
                    )
                ]
            )
    except Exception as exception:  # pylint: disable=broad-except
        logger.exception("Failed to start GUI: %s", exception)
