"""Setup"""
import io

from setuptools import find_packages, setup

PACKAGE_NAME = "systembridgeconnector"

# Get setup packages from requirements.txt
with io.open("requirements_setup.txt", encoding="utf-8") as f:
    requirements_setup = f.read().splitlines()

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

setup(
    name=PACKAGE_NAME,
    description="System Bridge Connector",
    keywords="system bridge connector",
    author="Aidan Timson (Timmo)",
    author_email="contact@timmo.xyz",
    license="MIT",
    url="https://github.com/timmo001/system-bridge",
    packages=find_packages(exclude=["tests", "generator"]),
    install_requires=requirements,
    setup_requires=requirements_setup,
    use_incremental=True,
)
