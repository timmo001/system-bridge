"""System Bridge: Remote Bridge Utilities"""
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_remote_bridge import RemoteBridge


def get_remote_bridges(
    database: Database,
) -> list[RemoteBridge]:
    """Get all remote bridges."""
    return database.get_data(RemoteBridge)
