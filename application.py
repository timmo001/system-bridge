"""System Bridge Backend."""
from json import loads
import logging

from typer import Argument, Option, Typer

from systembridgebackend import Application as BackendApplication
from systembridgegui import Application as GUIApplication
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

app = Typer()

settings = Settings()

logger = setup_logger(settings.data.log_level, "system-bridge")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@app.command()
def application(
    app_type: str = Argument("main", help="Application type"),
    command: str = Argument("main", help="Command"),
    data: str = Argument(None, help="Data"),
    init: bool = Option(False, "--init", help="Initialise"),
    no_frontend: bool = Option(False, "--no-frontend", help="No Frontend"),
    no_gui: bool = Option(False, "--no-gui", help="No GUI"),
) -> None:
    """Launch application."""
    try:
        if app_type == "main":
            logger.info("Launching Backend")
            BackendApplication(
                settings,
                init=init,
                no_frontend=no_frontend,
                no_gui=no_gui,
            )
        elif app_type == "gui":
            logger.info("Launching GUI")
            GUIApplication(
                settings,
                command=command,
                data=None if data is None or data == "" else loads(data),
            )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)

    logger.info("Application closed")


if __name__ == "__main__":
    app()
