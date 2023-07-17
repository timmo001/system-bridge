"""System Bridge: Main"""
import logging

import typer
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from . import Application

app = typer.Typer()

database = Database()
settings = Settings(database)

LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
logger = setup_logger(LOG_LEVEL, "system-bridge")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@app.command(name=None, short_help="Main Application")
def main(
    cli: bool = typer.Option(False, "--cli", help="CLI"),
    init: bool = typer.Option(False, "--init", help="Initialize"),
    no_frontend: bool = typer.Option(False, "--no-frontend", help="No Frontend"),
    no_gui: bool = typer.Option(False, "--no-gui", help="No GUI"),
) -> None:
    """Main Application"""
    try:
        Application(
            database,
            settings,
            cli=cli,
            init=init,
            no_frontend=no_frontend,
            no_gui=no_gui,
        )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)


if __name__ == "__main__":
    app()
