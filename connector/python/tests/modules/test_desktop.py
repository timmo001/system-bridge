"""Test the desktop module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.desktop import FIXTURE_DESKTOP
from systembridgeconnector.models.modules.desktop import (
    Desktop,
    DesktopKeyboard,
    DesktopWindow,
    DesktopWorkspace,
    Hyprland,
    HyprlandDisplay,
    HyprlandReserved,
    HyprlandScreencast,
    HyprlandWindow,
    HyprlandWorkspace,
)


def test_desktop(snapshot: SnapshotAssertion):
    """Test the desktop model."""
    desktop = FIXTURE_DESKTOP
    assert isinstance(desktop, Desktop)
    assert desktop == snapshot


def test_desktop_dict():
    """Test the desktop model converts nested dicts and maps."""
    desktop = Desktop(**asdict(FIXTURE_DESKTOP))
    assert desktop == FIXTURE_DESKTOP
    assert isinstance(desktop.keyboard, DesktopKeyboard)
    assert isinstance(desktop.windows[0], DesktopWindow)
    assert isinstance(desktop.workspaces[0], DesktopWorkspace)
    assert isinstance(desktop.hyprland, Hyprland)
    assert isinstance(desktop.hyprland.screencasts[0], HyprlandScreencast)
    assert isinstance(desktop.hyprland.displays["DP-1"], HyprlandDisplay)
    assert isinstance(desktop.hyprland.displays["DP-1"].reserved, HyprlandReserved)
    assert isinstance(desktop.hyprland.windows["0x2"], HyprlandWindow)
    assert isinstance(desktop.hyprland.workspaces["-98"], HyprlandWorkspace)


def test_desktop_windows():
    """Test the desktop model off Hyprland, with unknown fields."""
    desktop = Desktop(
        compositor="windows",  # type: ignore[arg-type]
        keyboard={"layout": "00000809", "name": None, "layouts": None},  # type: ignore[arg-type]
        windows=None,  # type: ignore[arg-type]
        workspaces=[],
        hyprland=None,
        unknown_field="test",
    )
    assert desktop.keyboard.layouts == []
    assert desktop.windows == []
    assert desktop.hyprland is None
