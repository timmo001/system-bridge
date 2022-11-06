"""System Bridge: Server Handler - Power"""
import os
import sys


def sleep() -> None:
    """Send the system to sleep."""
    if sys.platform == "linux":
        os.system("systemctl suspend")
    elif sys.platform == "win32":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")


def hibernate() -> None:
    """Hibernate the system."""
    if sys.platform == "linux":
        os.system("systemctl hibernate")
    elif sys.platform == "win32":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 1,1,0")


def restart() -> None:
    """Restart the system."""
    if sys.platform == "linux":
        os.system("systemctl restart")
    elif sys.platform == "win32":
        os.system("shutdown /r /t 0")


def shutdown() -> None:
    """Shutdown the system."""
    if sys.platform == "linux":
        os.system("systemctl poweroff")
    elif sys.platform == "win32":
        os.system("shutdown /s /t 0")


def lock() -> None:
    """Lock the system."""
    if sys.platform == "linux":
        os.system("xdg-screensaver lock")
    elif sys.platform == "win32":
        os.system("rundll32.exe user32.dll,LockWorkStation")


def logout() -> None:
    """Logout the user."""
    if sys.platform == "linux":
        os.system("pkexec --user $(whoami) gdm-force-logout")
    elif sys.platform == "win32":
        os.system("logoff")
