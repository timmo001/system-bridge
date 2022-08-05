"""System Bridge: Autostart"""
import platform


def autostart_disable():
    """Disable autostart"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .windows import autostart_windows_disable

        autostart_windows_disable()
    elif "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .linux import autostart_linux_disable

        autostart_linux_disable()


def autostart_enable():
    """Enable autostart"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .windows import autostart_windows_enable

        autostart_windows_enable()
    elif "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from .linux import autostart_linux_enable

        autostart_linux_enable()
