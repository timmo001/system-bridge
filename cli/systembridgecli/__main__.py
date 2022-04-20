"""System Bridge CLI: Main"""
import typer
from tabulate import tabulate

from systembridgecli.database import Database
from systembridgecli.settings import (
    SECRET_API_KEY,
    SETTING_PORT_API,
    TABLE_SETTINGS,
    Settings,
)

app = typer.Typer()
database = Database()
settings = Settings(database)


@app.command(name="api-key", short_help="Get API Key")
def api_key() -> None:
    """Get API Key"""
    secret(SECRET_API_KEY)


@app.command(name="api-port", short_help="Get API Port")
def api_port() -> None:
    """Get API Port"""
    setting(SETTING_PORT_API)


@app.command(name="settings", short_help="Get all Settings")
def settings_all():
    """Get all Settings"""
    data = database.read_table(TABLE_SETTINGS)
    table_data = tabulate(data, headers="keys", tablefmt="psql")
    typer.secho(table_data, fg=typer.colors.CYAN)


@app.command(name="setting", short_help="Get or Set Setting")
def setting(
    key: str,
    set: bool = False,
    value: str = None,
) -> None:
    """Get or Set Setting"""
    if set:
        settings.set(key, value)
    result = settings.get(key)
    if result:
        typer.secho(result, fg=typer.colors.CYAN)
    else:
        typer.secho(f"Could not find {key}", err=True, fg=typer.colors.RED)


@app.command(name="secret", short_help="Get or Set Secret")
def secret(
    key: str,
    set: bool = False,
    value: str = None,
) -> None:
    """Get or Set Secret"""
    if set:
        if value:
            settings.set_secret(key, value)
        else:
            typer.secho("Missing value to set", err=True, fg=typer.colors.RED)
            return
    result = settings.get_secret(key)
    if result:
        typer.secho(result, fg=typer.colors.MAGENTA)
    else:
        typer.secho(f"Could not find {key}", err=True, fg=typer.colors.RED)


if __name__ == "__main__":
    app()
