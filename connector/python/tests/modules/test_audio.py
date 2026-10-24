"""Test the audio module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.audio import FIXTURE_AUDIO
from systembridgeconnector.models.modules.audio import Audio, AudioDevice


def test_audio(snapshot: SnapshotAssertion):
    """Test the audio model."""
    audio = FIXTURE_AUDIO
    assert isinstance(audio, Audio)
    assert audio == snapshot


def test_audio_dict():
    """Test the audio model from a dict, as received from the backend."""
    audio = Audio(**asdict(FIXTURE_AUDIO))
    assert isinstance(audio.outputs[0], AudioDevice)
    assert isinstance(audio.inputs[0], AudioDevice)
    assert audio == FIXTURE_AUDIO
