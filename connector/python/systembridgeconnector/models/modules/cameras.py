"""Cameras."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


class CameraControlType(StrEnum):
    """The kind of value a camera control takes."""

    INTEGER = "integer"
    BOOLEAN = "boolean"
    MENU = "menu"


@filter_unexpected_fields
@dataclass(slots=True)
class CameraControlOption:
    """One choice of a menu control."""

    value: int
    name: str


@filter_unexpected_fields
@dataclass(slots=True)
class CameraControl:
    """A setting of a camera, such as its brightness, zoom or white balance."""

    id: str
    name: str
    type: str
    value: int
    minimum: int
    maximum: int
    step: int
    default: int
    group: str = ""
    options: list[CameraControlOption] = field(default_factory=list)
    inactive: bool = False
    read_only: bool = False

    def __post_init__(self) -> None:
        """Post Init."""
        self.options = [
            CameraControlOption(**cast(dict, o)) if isinstance(o, dict) else o
            for o in self.options or []
        ]


@filter_unexpected_fields
@dataclass(slots=True)
class Camera:
    """A video capture device, such as a webcam."""

    id: str
    name: str
    device: str
    driver: str | None = None
    controls: list[CameraControl] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.controls = [
            CameraControl(**cast(dict, c)) if isinstance(c, dict) else c
            for c in self.controls or []
        ]


@filter_unexpected_fields
@dataclass(slots=True)
class Cameras:
    """The system's cameras. Linux only, empty elsewhere."""

    cameras: list[Camera] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.cameras = [
            Camera(**cast(dict, c)) if isinstance(c, dict) else c
            for c in self.cameras or []
        ]
