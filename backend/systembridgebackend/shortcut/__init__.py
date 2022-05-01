"""System Bridge: Shortcut"""
import platform


def create_shortcuts():
    """Create shortcuts"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.shortcut.windows import create_windows_shortcuts

        create_windows_shortcuts()
    elif "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.shortcut.linux import create_linux_shortcuts

        create_linux_shortcuts()
