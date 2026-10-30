"""Camera Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class CameraControlRequest:
    """Sets one of a camera's controls, such as its brightness or zoom.

    A boolean's value is 0 or 1, and a menu's is one of its options' value.
    """

    id: str
    control: str
    value: int


@dataclass(slots=True)
class CameraCaptureRequest:
    """Takes a picture with a camera, by its id from the cameras module."""

    id: str


@dataclass(slots=True)
class CameraPicture:
    """A picture taken with a camera, as base64."""

    id: str
    content_type: str
    image: str
