"""Setup"""
import io
import json
import os
from distutils.dir_util import copy_tree

from setuptools import find_packages, setup

# Get setup packages from requirements.txt
with io.open("requirements_setup.txt", encoding="utf-8") as f:
    requirements_setup = f.read().splitlines()

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

copy_tree(
    "WindowsSensors/bin/net7.0-windows",
    "systembridgewindowssensors/bin",
)

package_data = []

for file in os.listdir("systembridgewindowssensors/bin"):
    if os.path.isfile(os.path.join("systembridgewindowssensors/bin", file)):
        package_data.append(os.path.join("bin", file).replace("\\", "/", -1))

for root, directories, files in os.walk("systembridgewindowssensors/bin"):
    for file in files:
        package_data.append(
            os.path.join(root, "/".join(directories), file)
            .replace("systembridgewindowssensors/", "")
            .replace("\\", "/", -1)
        )

print(json.dumps(package_data))

setup(
    name="systembridgewindowssensors",
    description="System Bridge Windows Sensors",
    keywords="system bridge windows sensors",
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
