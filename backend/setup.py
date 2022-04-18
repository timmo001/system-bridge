#!/usr/bin/env python
import io
import os
from unittest.mock import patch

from setuptools import find_packages, setup


def find(name, path):
    for root, _, files in os.walk(path):
        if name in files:
            return os.path.join(root, name)


# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

# Get version from version.txt
path = find("version.txt", "../")
print(path)
if not path:
    path = find("version.txt", "./")
print(path)
with io.open(path, encoding="utf-8") as f:
    version = f.read().splitlines()[0]

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
)
