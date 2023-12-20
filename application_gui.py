"""System Bridge GUI."""
import json
import logging
from typing import Optional

from systembridgegui import Application
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from typer import Argument, Typer

app = Typer()

settings = Settings()

logger = setup_logger(settings.data.log_level, "system-bridge-gui")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@app.command(name="gui", short_help="Launch GUI")
def gui(
    command: str = Argument("main", help="Command"),
    data: Optional[str] = Argument(None, help="Data"),
) -> None:
    """Launch GUI."""
    try:
        logger.info("Launching GUI")
        Application(
            settings,
            command=command,
            data=json.loads(data) if data else None,
        )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)


if __name__ == "__main__":
    app()
