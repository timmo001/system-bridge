"""Fixture for bluetooth module."""

from systembridgeconnector.models.modules.bluetooth import Bluetooth, BluetoothDevice

FIXTURE_BLUETOOTH = Bluetooth(
    devices=[
        BluetoothDevice(
            address="80:C3:BA:7B:93:4E",
            name="Headphones",
            type="audio-headset",
            connected=True,
        ),
        BluetoothDevice(
            address="E3:C2:02:B9:C2:62",
            name="Keyboard",
            type="input-keyboard",
            connected=False,
        ),
    ],
    powered=True,
)
