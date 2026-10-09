"""Fixture for processes module."""

from systembridgeconnector.models.modules.processes import Process

FIXTURE_PROCESSES = [
    Process(
        id=1234,
        name="name",
        cpu_usage=12.3,
        created=12.3,
        memory_usage=12.3,
        path="/path",
        status="running",
        username="username",
        working_directory="/working/directory",
    )
]
