"""System Bridge: Sensors"""
from __future__ import annotations
import json
import os
import psutil
import subprocess
import sys

from systembridgeshared.base import Base


class Sensors(Base):
    """Sensors"""

    def fans(self) -> dict | None:
        """Get fans"""
        if not hasattr(psutil, "sensors_fans"):
            return None
        return psutil.sensors_fans()

    def temperatures(self) -> dict | None:
        """Get temperatures"""
        if not hasattr(psutil, "sensors_temperatures"):
            return None
        return psutil.sensors_temperatures()

    def windows_sensors(self) -> list[dict] | None:
        """Get windows sensors"""
        if sys.platform != "win32":
            return None

        path = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "../../../../",
            )
        )
        if not os.path.exists(
            os.path.join(
                path,
                "WindowsSensors/bin/SystemBridgeWindowsSensors.exe",
            )
        ):
            return None

        path = os.path.abspath(
            os.path.join(
                path,
                "WindowsSensors/bin/SystemBridgeWindowsSensors.exe",
            )
        )
        self._logger.debug("Windows sensors path: %s", path)
        with subprocess.Popen(
            [path],
            stdout=subprocess.PIPE,
        ) as pipe:
            result = pipe.communicate()[0].decode()
        self._logger.debug("Windows sensors result: %s", result)

        return json.loads(result)
