"""System Bridge: Install"""
import platform
import subprocess
import sys

command = [
    sys.executable,
    "-m",
    "pip",
    "install",
    "--upgrade",
]

if "--dev" in sys.argv:
    command.append("--pre")

command = [
    *command,
    "systembridgeshared",
    "systembridgebackend",
    "systembridgecli",
    "systembridgeconnector",
    "systembridgefrontend",
    "systembridgegui",
]

if "Windows" in platform.system():
    command.append("systembridgewindowssensors")

print("Installing..")
print(command)

with subprocess.Popen(command) as process:
    process.wait()
