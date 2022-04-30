"""System Bridge: Autostart"""
import platform


def autostart_disable():
    """Disable autostart"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.autostart.windows import autostart_windows_disable

        autostart_windows_disable()
    if "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.autostart.linux import autostart_linux_disable

        autostart_linux_disable()


def autostart_enable():
    """Enable autostart"""
    if "Windows" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.autostart.windows import autostart_windows_enable

        autostart_windows_enable()
    if "Linux" in platform.system():
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgebackend.autostart.linux import autostart_linux_enable

        autostart_linux_enable()
