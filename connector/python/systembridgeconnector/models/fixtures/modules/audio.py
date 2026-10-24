"""Fixture for audio module."""

from systembridgeconnector.models.modules.audio import Audio, AudioDevice

FIXTURE_AUDIO = Audio(
    outputs=[
        AudioDevice(
            id="alsa_output.usb-Generic_USB_Audio-00.HiFi__Speaker__sink",
            name="Headphones",
            volume=50,
            muted=False,
            default=True,
        ),
        AudioDevice(
            id="alsa_output.pci-0000_00_1f.3.hdmi-stereo",
            name="HDMI Output",
            volume=100,
            muted=True,
        ),
    ],
    inputs=[
        AudioDevice(
            id="alsa_input.usb-Generic_USB_Audio-00.HiFi__Mic__source",
            name="Microphone",
            volume=80,
            muted=False,
            default=True,
        ),
    ],
)
