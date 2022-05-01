"""System Bridge: Autostart Windows"""
import platform
import sys


def autostart_windows_disable():
    """Disable autostart for Windows"""
    if platform.system() != "Windows":
        return

    from winreg import (
        HKEY_CURRENT_USER,
        KEY_ALL_ACCESS,
        CloseKey,
        DeleteValue,
        OpenKey,
    )

    key = OpenKey(
        HKEY_CURRENT_USER,
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        reserved=0,
        access=KEY_ALL_ACCESS,
    )
    DeleteValue(key, "systembridgebackend")
    CloseKey(key)


def autostart_windows_enable():
    """Enable autostart for Windows"""
    if platform.system() != "Windows":
        return

    from winreg import (
        HKEY_CURRENT_USER,
        KEY_ALL_ACCESS,
        REG_SZ,
        CloseKey,
        OpenKey,
        SetValueEx,
    )

    key = OpenKey(
        HKEY_CURRENT_USER,
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        reserved=0,
        access=KEY_ALL_ACCESS,
    )
    SetValueEx(
        key,
        "systembridgebackend",
        0,
        REG_SZ,
        f'"{sys.executable}" -m systembridgebackend --silent',
    )
    CloseKey(key)
