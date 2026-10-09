"""Fixtures for displays module."""

from systembridgeconnector.models.modules.displays import Display

FIXTURE_DISPLAYS = [
    Display(
        id="abc123",
        name="name",
        resolution_horizontal=1920,
        resolution_vertical=1080,
        x=1920,
        y=1080,
        width=1920,
        height=1080,
        is_primary=True,
        pixel_clock=60.0,
        refresh_rate=60.0,
    )
]
