"""System Bridge: Linux Autostart"""
import os
import sys

desktop_entry = f"""
[Desktop Entry]
Name=System Bridge
Comment=System Bridge
Exec={sys.executable} -m systembridgebackend
Icon={os.path.join(os.path.dirname(__file__),'../../icon.png')}
Terminal=false
Type=Application
Categories=Application;
"""


def autostart_linux_disable():
    """Disable autostart for Linux"""
    path = os.path.expanduser("~/.config/autostart/systembridge.desktop")
    if os.path.exists(path):
        os.remove(path)


def autostart_linux_enable():
    """Enable autostart for Linux"""
    path = os.path.expanduser("~/.config/autostart/systembridge.desktop")
    if not os.path.exists(path):
        os.makedirs(path)
    path = os.path.join(path, "systembridge.desktop")
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as file:
            file.write(desktop_entry)
