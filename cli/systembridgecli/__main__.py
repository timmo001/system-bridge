"""System Bridge CLI: Main"""
import os
import subprocess
import sys
import typer
from tabulate import tabulate
from uuid import uuid4

from systembridgeshared.common import get_user_data_directory
from systembridgeshared.const import SECRET_API_KEY, SETTING_PORT_API, TABLE_SETTINGS
from systembridgeshared.database import Database
from systembridgeshared.settings import Settings

app = typer.Typer()
database = Database()
settings = Settings(database)


@app.command(name="api-key", short_help="Get api key")
def api_key(reset: bool = False) -> None:
    """Get API Key"""
    if reset:
        secret(SECRET_API_KEY, True, str(uuid4()))
    else:
        secret(SECRET_API_KEY)


@app.command(name="api-port", short_help="Get api port")
def api_port() -> None:
    """Get API Port"""
    setting(SETTING_PORT_API)


@app.command(name="data", short_help="Get data")
def data(module: str, key=None) -> None:
    """Get data"""
    if key:
        output = database.read_table_by_key(module, key)
    else:
        output = database.read_table(module)
    table_data = tabulate(output, headers="keys", tablefmt="psql")
    typer.secho(table_data, fg=typer.colors.GREEN)


@app.command(name="data-value", short_help="Get data value")
def data_value(
    module: str,
    key: str,
) -> None:
    """Get data value"""
    output = database.read_table_by_key(module, key).to_dict(orient="records")[0][
        "value"
    ]
    typer.secho(output, fg=typer.colors.GREEN)


@app.command(name="settings", short_help="Get all settings")
def settings_all():
    """Get all Settings"""
    table_data = tabulate(
        database.read_table(TABLE_SETTINGS), headers="keys", tablefmt="psql"
    )
    typer.secho(table_data, fg=typer.colors.CYAN)


@app.command(name="setting", short_help="Get or set setting")
def setting(
    key: str,
    set_value: bool = False,
    value: str = None,
) -> None:
    """Get or Set Setting"""
    if set_value:
        settings.set(key, value)
    if result := settings.get(key):
        typer.secho(result, fg=typer.colors.CYAN)
    else:
        typer.secho(f"Could not find {key}", err=True, fg=typer.colors.RED)


@app.command(name="secret", short_help="Get or set secret")
def secret(
    key: str,
    set_value: bool = False,
    value: str = None,
) -> None:
    """Get or Set Secret"""
    if set_value:
        if value:
            settings.set_secret(key, value)
        else:
            typer.secho("Missing value to set", err=True, fg=typer.colors.RED)
            return
    if result := settings.get_secret(key):
        typer.secho(result, fg=typer.colors.MAGENTA)
    else:
        typer.secho(f"Could not find {key}", err=True, fg=typer.colors.RED)


@app.command(name="path-logs-backend", short_help="Backend logs path")
def path_logs_backend() -> None:
    """Open backend logs path"""
    typer.secho(
        os.path.join(get_user_data_directory(), "system-bridge.log"),
        fg=typer.colors.YELLOW,
    )


@app.command(name="path-logs-gui", short_help="GUI logs path")
def path_logs_gui() -> None:
    """Open gui logs path"""
    typer.secho(
        os.path.join(get_user_data_directory(), "system-bridge-gui.log"),
        fg=typer.colors.YELLOW,
    )


@app.command(name="open-logs-backend", short_help="Open backend logs")
def open_logs_backend() -> None:
    """Open backend logs"""
    path = os.path.join(get_user_data_directory(), "system-bridge.log")
    if sys.platform == "win32":
        os.startfile(path)
    else:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.call([opener, path])


@app.command(name="open-logs-gui", short_help="Open GUI logs")
def open_logs_gui() -> None:
    """Open gui logs"""
    path = os.path.join(get_user_data_directory(), "system-bridge-gui.log")
    if sys.platform == "win32":
        os.startfile(path)
    else:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.call([opener, path])


if __name__ == "__main__":
    app()
