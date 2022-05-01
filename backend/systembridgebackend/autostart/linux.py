"""System Bridge: Autostart Linux"""
import os
import sys

desktop_entry = f"""
[Desktop Entry]
Name=System Bridge
Comment=System Bridge
Exec={sys.executable} -m systembridgebackend
Icon={os.path.join(os.path.dirname(__file__),'../icon.png')}
Terminal=false
Type=Application
Categories=Application;
"""

path = os.path.expanduser("~/.config/autostart/systembridge.desktop")


def autostart_linux_disable():
    """Disable autostart for Linux"""
    if os.path.exists(path):
        os.remove(path)


def autostart_linux_enable():
    """Enable autostart for Linux"""
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(desktop_entry)
