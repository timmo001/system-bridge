"""System Bridge."""
import logging
from os import path
import subprocess

from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from typer import Typer

app = Typer()

settings = Settings()

logger = setup_logger(settings.data.log_level, "system-bridge")
logging.getLogger("zeroconf").setLevel(logging.ERROR)

applications = [
    "systembridgebackend",
    "systembridgegui",
]


def application_launch_and_keep_alive(name: str) -> None:
    """Launch application and keep alive."""
    logger.info("Launching %s", name)

    application_path = path.join("..", name, name)
    logger.info("Application path: %s", application_path)

    # Run application process
    with subprocess.Popen(
        [application_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ) as process:
        # Wait for process to finish
        process.wait()

        if code := process.wait() == 0:
            logger.info("Application %s exited normally with code %s", name, code)
            return

    logger.error("Application %s exited with code %s", name, code)
    logger.info("Restarting application %s", name)
    application_launch_and_keep_alive(name)


@app.command(name="application", short_help="Launch Application")
def application() -> None:
    """Launch Application."""
    logger.info("Launching application")
    for name in applications:
        application_launch_and_keep_alive(name)


if __name__ == "__main__":
    app()
