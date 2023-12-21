"""System Bridge."""
import asyncio
import logging
import subprocess
from dataclasses import dataclass
from os import path

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
        name="backend",
        path=path.join("..", "systembridge", "systembridge"),
    ),
    Application(
        name="frontend",
        path=path.join("..", "systembridge", "systembridge", "frontend", "frontend"),
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
