"""System Bridge"""
import json
import logging
from typing import Optional

import typer
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

app = typer.Typer()

database = Database()
settings = Settings(database)

LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
logger = setup_logger(LOG_LEVEL, "system-bridge")
logging.getLogger("zeroconf").setLevel(logging.ERROR)


@app.command(name="main", short_help="Main Application")
def main(
    cli: bool = typer.Option(False, "--cli", help="CLI"),
    init: bool = typer.Option(False, "--init", help="Initialize"),
    no_frontend: bool = typer.Option(False, "--no-frontend", help="No Frontend"),
    no_gui: bool = typer.Option(False, "--no-gui", help="No GUI"),
) -> None:
    """Main Application"""
    try:
        from systembridgebackend import (
            Application as BackendApplication,  # pylint: disable=import-outside-toplevel
        )

        BackendApplication(
            database,
            settings,
            cli=cli,
            init=init,
            no_frontend=no_frontend,
            no_gui=no_gui,
        )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)


@app.command(name="gui", short_help="GUI")
def gui(
    command: str = typer.Argument("main", help="Command"),
    data: Optional[str] = typer.Argument(None, help="Data"),
) -> None:
    """GUI"""
    try:
        from systembridgegui import (
            Application as GUIApplication,  # pylint: disable=import-outside-toplevel
        )

        GUIApplication(
            database,
            settings,
            command=command,
            data=json.loads(data) if data else None,
        )
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)


app()
