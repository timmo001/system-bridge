"""System Bridge: Version"""
import os
import subprocess
import sys
import typer

PACKAGES = [
    {"path": "backend", "module": "systembridgebackend"},
    {"path": "cli", "module": "systembridgecli"},
    {"path": "connector", "module": "systembridgeconnector"},
    {"path": "frontend", "module": "systembridgefrontend"},
    {"path": "gui", "module": "systembridgegui"},
    {"path": "shared", "module": "systembridgeshared"},
    {"path": "windowssensors", "module": "systembridgewindowssensors"},
]

app = typer.Typer()


def bump_packages(arg: str) -> None:
    """Bump packages"""
    for package in PACKAGES:
        command = [
            sys.executable,
            "-m",
            "incremental.update",
            package["module"],
            arg,
        ]

        print(f"Bumping {package['module']} package..")
        print(command)

        with subprocess.Popen(
            command,
            cwd=os.path.join(os.path.dirname(__file__), "../", package["path"]),
        ) as process:
            result = process.wait()
            if result != 0:
                print(f"Failed to bump {package['module']} package..")
                sys.exit(1)
        if "--newversion=" in arg:
            with subprocess.Popen(
                [
                    "git",
                    "commit",
                    "-am",
                    f'"Bump {package["module"]} version to {arg.replace("--newversion=", "")}"',
                ],
            ) as process:
                result = process.wait()
                if result != 0:
                    print(f"Failed to commit {package['module']} package..")
                    sys.exit(1)


@app.command()
def dev() -> None:
    """Bump dev"""
    bump_packages("--dev")


@app.command()
def release(version: str) -> None:
    """Bump release"""
    bump_packages(f"--newversion={version}")


app()
