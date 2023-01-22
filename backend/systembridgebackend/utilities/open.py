"""System Bridge: Open Utilities"""
import os
import subprocess
import sys
from webbrowser import open_new_tab


def open_path(
    path: str,
) -> None:
    """Open a file."""
    if sys.platform == "win32":
        os.startfile(path)
    else:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.call([opener, path])


def open_url(
    url: str,
) -> None:
    """Open a URL in the default browser."""
    open_new_tab(url)
