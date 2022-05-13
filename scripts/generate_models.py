"""System Bridge: Version"""
import os
import subprocess
from distutils.dir_util import copy_tree

import typer

app = typer.Typer()


@app.command()
def models() -> None:
    """Generate models"""
    typer.secho(
        "Generating models..",
        fg=typer.colors.GREEN,
    )

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

                typer.secho(
                    f"Generating model {module} from {path_from} to {path_to}",
                    fg=typer.colors.GREEN,
                )

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
                    "--target-python-version",
                    "3.9",
                    "--snake-case-field",
                    "--use-schema-description",
                    "--use-standard-collections",
                ]

                typer.secho(" ".join(command), fg=typer.colors.CYAN)

                with subprocess.Popen(command) as process:
                    process.wait()

    typer.secho(
        f"Copying models from {path_to_models_shared} to {path_to_models_connector}",
        fg=typer.colors.GREEN,
    )

    copy_tree(path_to_models_shared, path_to_models_connector)


app()
