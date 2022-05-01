"""System Bridge: Shortcut Windows"""
import os
import platform
import sys


def create_windows_shortcuts():
    """Create Windows shortcuts"""
    if platform.system() != "Windows":
        return

    from winreg import (
        HKEY_CURRENT_USER,
        KEY_READ,
        CloseKey,
        OpenKey,
        QueryValueEx,
    )
    from win32com.client import Dispatch

    registry_key = OpenKey(
        HKEY_CURRENT_USER,
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders",
        reserved=0,
        access=KEY_READ,
    )
    registry_value, _ = QueryValueEx(registry_key, "Programs")
    CloseKey(registry_key)

    directory = os.path.abspath(
        os.path.join(
            os.path.expandvars(os.path.normpath(registry_value)),
            "systembridge",
        )
    )
    os.makedirs(directory, exist_ok=True)

    link_path = os.path.join(directory, "System Bridge.lnk")
    shell = Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(link_path)
    shortcut.Arguments = "-m systembridgebackend --silent"
    shortcut.Description = "System Bridge"
    shortcut.IconLocation = os.path.join(os.path.dirname(__file__), "../icon.ico")
    shortcut.Targetpath = sys.executable
    shortcut.WorkingDirectory = sys.prefix
    shortcut.save()
