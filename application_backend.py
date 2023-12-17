"""System Bridge Backend."""
import logging

from systembridgebackend import Application
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
from typer import Option, Typer

app = Typer()

settings = Settings()

logger = setup_logger(settings.data.log_level, "system-bridge-backend")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@app.command(name="backend", short_help="Launch backend")
def backend(
    init: bool = Option(False, "--init", help="Initialise"),
    no_frontend: bool = Option(False, "--no-frontend", help="No Frontend"),
) -> None:
    """Launch backend."""
    try:
        logger.info("Launching Backend")
        Application(
            settings,
            init=init,
            no_frontend=no_frontend,
        )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)


if __name__ == "__main__":
    app()
