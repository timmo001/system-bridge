"""System Bridge: GUI"""
from logging import Logger
import os
import subprocess
import sys


async def start_gui(logger: Logger) -> None:
    """Start the GUI"""
    logger.info("Starting GUI")
    logger.info("Executable: %s", sys.executable)
    with subprocess.Popen(
        [
            sys.executable,
            "-m",
            "systembridgegui",
        ]
        if "python" in sys.executable.lower()
        else [
            os.path.join(
                os.path.dirname(sys.executable),
                f"systembridgegui{'.exe' if sys.platform == 'win32' else ''}",
            )
        ]
    ) as process:
        logger.info("GUI started with PID: %s", process.pid)
        exit_code = process.wait()
        if exit_code != 0:
            logger.error("GUI exited with code: %s", exit_code)
            await start_gui(logger)
        else:
            logger.info("GUI exited with code: %s", exit_code)
