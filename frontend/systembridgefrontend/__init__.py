"""System Bridge Frontend"""
import os


def get_frontend_path() -> str:
    """Get frontend path (absolute)"""
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "out"),
    )
