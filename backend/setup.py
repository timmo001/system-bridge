"""Setup"""
import io
import platform

from setuptools import find_packages, setup

# Get setup packages from requirements.txt
with io.open("requirements_setup.txt", encoding="utf-8") as f:
    requirements_setup = f.read().splitlines()

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

if platform.system() == "Windows":
    with io.open("requirements_windows.txt", encoding="utf-8") as f:
        requirements = [
            *requirements,
            *f.read().splitlines(),
        ]

package_data = ["icon.png", "icon.ico"]

setup(
    name="systembridgebackend",
    description="System Bridge Backend",
    keywords="system bridge backend",
    author="Aidan Timson (Timmo)",
    author_email="contact@timmo.xyz",
    license="MIT",
    url="https://github.com/timmo001/system-bridge",
    packages=find_packages(exclude=["tests", "generator"]),
    package_data={"": package_data},
    install_requires=requirements,
    setup_requires=requirements_setup,
    use_incremental=True,
)
