#!/usr/bin/env python
import io
import json

from setuptools import find_packages, setup

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

# Get version from package.json
with io.open("../package.json", encoding="utf-8") as f:
    package = json.load(f)

version = package["version"]

setup(
    name="systembridgegui",
    version=version,
    description="System Bridge GUI",
    keywords="system bridge gui",
    author="Aidan Timson (Timmo)",
    author_email="contact@timmo.xyz",
    license="MIT",
    url="https://github.com/timmo001/system-bridge",
    packages=find_packages(exclude=["tests", "generator"]),
    install_requires=requirements,
)
