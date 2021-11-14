#!/usr/bin/env python
import io
import os
import json

from setuptools import find_packages, setup


def find(name, path):
    for root, dir, files in os.walk(path):
        print(f"{root} : {dir} : {files}")
        if name in files:
            return os.path.join(root, name)


# print(find("package.json", "./"))
# print(find("package.json", "../"))

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

# Get version from package.json
print("./")
path = find("package.json", "./")
if path is None:
    print("../")
    path = find("package.json", "../")

print(path)

with io.open(path, encoding="utf-8") as f:
    package = json.load(f)

version = package["version"]

print(version)

# setup(
#     name="systembridgegui",
#     version=version,
#     description="System Bridge GUI",
#     keywords="system bridge gui",
#     author="Aidan Timson (Timmo)",
#     author_email="contact@timmo.xyz",
#     license="MIT",
#     url="https://github.com/timmo001/system-bridge",
#     packages=find_packages(exclude=["tests", "generator"]),
#     install_requires=requirements,
# )
