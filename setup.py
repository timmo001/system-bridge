"""Setup."""

from setuptools import find_packages, setup

# Get packages from requirements.txt
with open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

with open("README.md", encoding="utf-8") as f:
    readme = f.read()

setup(
    name="systembridgeconnector",
    version="5.4.5",
    author="Aidan Timson (Timmo)",
    author_email="aidan@timmo.dev",
    description="System Bridge Connector",
    keywords="system-bridge",
    license="Apache-2.0",
    long_description=readme,
    long_description_content_type="text/markdown",
    url="https://github.com/timmo001/system-bridge-connector",
    install_requires=requirements,
    packages=find_packages(exclude=["tests", "tests.*", "generator", "generator.*"]),
    package_data={"systembridgeconnector": ["py.typed"]},
    python_requires=">=3.11",
)
