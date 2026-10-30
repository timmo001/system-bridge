"""Fixture for cameras module."""

from systembridgeconnector.models.modules.cameras import (
    Camera,
    CameraControl,
    CameraControlOption,
    Cameras,
)

FIXTURE_CAMERAS = Cameras(
    cameras=[
        Camera(
            id="usb-Insta360_Insta360_Link_2C-video-index0",
            name="Insta360 Link 2C: Insta360 Link",
            device="/dev/video0",
            driver="uvcvideo",
            controls=[
                CameraControl(
                    id="brightness",
                    name="Brightness",
                    type="integer",
                    value=50,
                    minimum=0,
                    maximum=100,
                    step=1,
                    default=50,
                ),
                CameraControl(
                    id="power_line_frequency",
                    name="Power Line Frequency",
                    type="menu",
                    value=1,
                    minimum=0,
                    maximum=2,
                    step=1,
                    default=3,
                    options=[
                        CameraControlOption(value=0, name="Disabled"),
                        CameraControlOption(value=1, name="50 Hz"),
                        CameraControlOption(value=2, name="60 Hz"),
                    ],
                ),
                CameraControl(
                    id="focus_absolute",
                    name="Focus, Absolute",
                    type="integer",
                    value=94,
                    minimum=0,
                    maximum=100,
                    step=1,
                    default=50,
                    inactive=True,
                ),
                CameraControl(
                    id="focus_automatic_continuous",
                    name="Focus, Automatic Continuous",
                    type="boolean",
                    value=1,
                    minimum=0,
                    maximum=1,
                    step=1,
                    default=0,
                ),
            ],
        )
    ]
)
