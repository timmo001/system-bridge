"""Setup"""
import io
import os

from setuptools import find_packages, setup

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as file:
    requirements = file.read().splitlines()

# Get version from version.txt
with io.open(
    os.path.join(os.path.dirname(__file__), "../version.txt"), encoding="utf-8"
) as file:
    version = file.read().splitlines()[0]

# Write version file into
with io.open(
    os.path.join(os.path.dirname(__file__), "systembridgebackend/version.txt"),
    encoding="utf-8",
    mode="w",
) as file:
    file.write(version)

package_data = ["version.txt"]

setup(
    name="systembridgebackend",
    version=version,
    description="System Bridge Backend",
    keywords="system bridge backend",
    author="Aidan Timson (Timmo)",
    author_email="contact@timmo.xyz",
    license="MIT",
    url="https://github.com/timmo001/system-bridge",
    packages=find_packages(exclude=["tests", "generator"]),
    install_requires=requirements,
    package_data={"": package_data},
)
