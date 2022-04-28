"""System Bridge Windows Sensors"""
import os


def get_windowssensors_path() -> str:
    """Get windows sensors path (absolute)"""
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "bin/SystemBridgeWindowsSensors.exe"),
    )
