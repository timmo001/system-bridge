"""System Bridge: Sensors"""
from __future__ import annotations

import json
import subprocess
import sys

import psutil
from systembridgeshared.base import Base


class Sensors(Base):
    """Sensors"""

    def fans(self) -> dict | None:
        """Get fans"""
        if not hasattr(psutil, "sensors_fans"):
            return None
        return psutil.sensors_fans()  # type: ignore

    def temperatures(self) -> dict | None:
        """Get temperatures"""
        if not hasattr(psutil, "sensors_temperatures"):
            return None
        return psutil.sensors_temperatures()  # type: ignore

    def windows_sensors(self) -> dict | None:
        """Get windows sensors"""
        if sys.platform != "win32":
            return None

        try:
            # Import here to not raise error when importing file on linux
            # pylint: disable=import-error, import-outside-toplevel
            from systembridgewindowssensors import get_windowssensors_path
        except (ImportError, ModuleNotFoundError) as error:
            self._logger.error("Windows sensors not found: %s", error)
            return None

        path = get_windowssensors_path()

        self._logger.debug("Windows sensors path: %s", path)
        with subprocess.Popen(
            [path],
            stdout=subprocess.PIPE,
        ) as pipe:
            result = pipe.communicate()[0].decode()
        self._logger.debug("Windows sensors result: %s", result)

        try:
            return json.loads(result)
        except json.decoder.JSONDecodeError as error:
            self._logger.error(error)
            return None
