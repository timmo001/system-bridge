"""Process Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class ProcessKillRequest:
    """Process Kill Request.

    Ends a process, by its id from the processes module. It's asked to stop,
    or with force ended straight away, losing anything unsaved.
    """

    id: int
    force: bool = False
