"""Test the cameras module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.cameras import FIXTURE_CAMERAS
from systembridgeconnector.models.modules.cameras import (
    Camera,
    CameraControl,
    CameraControlOption,
    CameraFormat,
    Cameras,
    CameraSize,
)


def test_cameras(snapshot: SnapshotAssertion):
    """Test the cameras model."""
    cameras = FIXTURE_CAMERAS
    assert isinstance(cameras, Cameras)
    assert cameras == snapshot


def test_cameras_dict():
    """Test the cameras model from a dict, as received from the backend."""
    cameras = Cameras(**asdict(FIXTURE_CAMERAS))
    camera = cameras.cameras[0]
    assert isinstance(camera, Camera)
    assert isinstance(camera.controls[1], CameraControl)
    assert isinstance(camera.controls[1].options[0], CameraControlOption)
    assert isinstance(camera.format, CameraFormat)
    assert isinstance(camera.formats[0], CameraFormat)
    assert isinstance(camera.sizes[0], CameraSize)
    assert cameras == FIXTURE_CAMERAS
