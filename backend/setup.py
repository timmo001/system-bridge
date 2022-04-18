"""Setup"""
import io

from setuptools import find_packages, setup

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

# Get version from version.txt
with io.open("version.txt", encoding="utf-8") as f:
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
