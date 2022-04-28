"""Setup"""
import io
import os

from distutils.dir_util import copy_tree
from setuptools import find_packages, setup

# Get setup packages from requirements.txt
with io.open("requirements_setup.txt", encoding="utf-8") as f:
    requirements_setup = f.read().splitlines()

# Get packages from requirements.txt
with io.open("requirements.txt", encoding="utf-8") as f:
    requirements = f.read().splitlines()

copy_tree("out", "systembridgefrontend/out")

package_data = ["out/**/*"]

for root, directories, files in os.walk("systembridgefrontend/out"):
    for file in files:
        package_data.append(
            os.path.join(root, "/".join(directories), file)
            .replace("systembridgefrontend/", "")
            .replace("\\", "/", -1)
        )

print(package_data)

setup(
    name="systembridgefrontend",
    description="System Bridge Frontend",
    keywords="system bridge frontend",
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
