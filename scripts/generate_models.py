"""System Bridge: Version"""
import os
import subprocess
import sys
from distutils.dir_util import copy_tree

print("Generating models..")

path_from_schemas = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "schemas",
    )
)
path_to_models_connector = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "connector",
        "systembridgeconnector",
        "models",
    )
)
path_to_models_shared = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "shared",
        "systembridgeshared",
        "models",
    )
)

for root, _, files in os.walk(path_from_schemas):
    for file in files:
        if file.endswith(".json"):
            module = file.split(".")[0]

            path_from = os.path.join(root, file)
            path_to = os.path.join(path_to_models_shared, module + ".py")

            print(f"Generating model {module} from {path_from} to {path_to}")

            command = [
                "datamodel-codegen",
                "--disable-timestamp",
                "--class-name",
                module,
                "--input",
                path_from,
                "--input-file-type",
                "jsonschema",
                "--output",
                path_to,
                "--snake-case-field",
                "--use-schema-description",
                "--use-standard-collections",
            ]

            print(" ".join(command))

            with subprocess.Popen(command) as process:
                process.wait()

            command = [
                sys.executable,
                "-m",
                "black",
                "-t",
                "py39",
                path_to,
            ]

            print(" ".join(command))

            with subprocess.Popen(command) as process:
                process.wait()

print(f"Copying models from {path_to_models_shared} to {path_to_models_connector}")

copy_tree(path_to_models_shared, path_to_models_connector)
