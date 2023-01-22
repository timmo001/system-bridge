"""System Bridge: Shortcuts"""
import platform


def create_shortcuts():
    """Create shortcuts"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .windows import create_windows_shortcuts

        create_windows_shortcuts()
    elif "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .linux import create_linux_shortcuts

        create_linux_shortcuts()
