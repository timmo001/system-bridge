"""System Bridge."""
import asyncio
from dataclasses import dataclass
import logging
from os import path
import subprocess
import sys

from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from typer import Typer

app = Typer()

settings = Settings()

logger = setup_logger(settings.data.log_level, "system-bridge")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@dataclass
class Application:
    """Application."""

    name: str
    path: str
    task: asyncio.Task | None = None
    process: subprocess.Popen | None = None


applications = [
    Application(
        name="systembridgebackend",
        path=path.abspath(
            path.join(
                "..",
                "systembridgebackend",
                f"systembridgebackend{'.exe' if sys.platform == 'win32' else ''}",
            )
        ),
    ),
    Application(
        name="systembridgegui",
        path=path.abspath(
            path.join(
                "..",
                "systembridgegui",
                f"systembridgegui{'.exe' if sys.platform == 'win32' else ''}",
            )
        ),
    ),
]


async def application_launch_and_keep_alive(application: Application) -> None:
    """Launch application and keep alive."""
    logger.info("Launching application: %s", application)

    # Run application process
    with subprocess.Popen(
        [application.path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ) as process:
        # Wait for process to finish
        process.wait()

        if code := process.wait() == 0:
            logger.info(
                "Application %s exited normally with code %s",
                application.name,
                code,
            )
            return

    logger.error("Application %s exited with code %s", application.name, code)
    logger.info("Restarting application: %s", application)
    await application_launch_and_keep_alive(application)


@app.command(name="main", short_help="Launch Applications")
def main() -> None:
    """Launch Applications."""
    logger.info("Launching applications")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for application in applications:
        application.task = loop.create_task(
            application_launch_and_keep_alive(application),
            name=application.name,
        )

    loop.run_forever()


if __name__ == "__main__":
    app()
