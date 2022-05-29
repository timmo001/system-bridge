"""System Bridge: Update"""
from __future__ import annotations

import asyncio
import importlib.util
from json import loads
import os
import platform
import subprocess
import sys
import urllib.request

from systembridgeshared.base import Base


class Update(Base):
    """Update"""

    def _install_package(
        self,
        package: str,
    ) -> None:
        """Install a package."""
        args = [
            sys.executable,
            "-m",
            "pip",
            "install",
            package,
        ]
        self._logger.debug(" ".join(args))
        with subprocess.Popen(args, stdout=subprocess.PIPE) as pipe:
            result = pipe.communicate()[0].decode()
        self._logger.info("Result: %s", result)

    def _update(self, packages: dict[str, str | None]) -> None:
        """Update each package."""
        for package, version in packages.items():
            self._logger.info("Updating %s to version %s", package, version)
            if version:
                self._install_package(f"{package}=={version}")

        asyncio.get_running_loop().call_later(
            5, os.execl, sys.executable, sys.executable, *sys.argv
        )

    def update(
        self,
        version: str | None,
        wait: bool = False,
    ) -> dict[str, str | None]:
        """Update the application."""
        packages = {
            "systembridgeshared": version,
            "systembridgebackend": version,
        }
        if importlib.util.find_spec("systembridgecli") is not None:
            packages["systembridgecli"] = version
        if importlib.util.find_spec("systembridgeconnector") is not None:
            packages["systembridgeconnector"] = version
        if importlib.util.find_spec("systembridgefrontend") is not None:
            packages["systembridgefrontend"] = version
        if importlib.util.find_spec("systembridgegui") is not None:
            packages["systembridgegui"] = version
        if (
            "Windows" in platform.system()
            and importlib.util.find_spec("systembridgewindowssensors") is not None
        ):
            packages["systembridgewindowssensors"] = version

        for package, new_version in packages.items():
            if new_version is None:
                with urllib.request.urlopen(
                    f"https://pypi.org/pypi/{package}/json"
                ) as response:
                    data = loads(response.read())
                new_version = data["info"]["version"]
                packages[package] = new_version

        if wait:
            self._update(packages)
        else:
            asyncio.get_running_loop().call_later(2, self._update, packages)

        return packages
