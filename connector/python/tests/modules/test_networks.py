"""Test the networks module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.networks import FIXTURE_NETWORKS
from systembridgeconnector.models.modules.networks import NetworkConnection, Networks


def test_networks(snapshot: SnapshotAssertion):
    """Test the networks model."""
    networks = FIXTURE_NETWORKS
    assert isinstance(networks, Networks)
    assert isinstance(networks.connections, list)
    assert isinstance(networks.connections[0], NetworkConnection)
    assert networks == snapshot


def test_networks_dict(snapshot: SnapshotAssertion):
    """Test the networks model to dict."""
    networks_dict = asdict(FIXTURE_NETWORKS)
    assert isinstance(networks_dict, dict)
    assert networks_dict == snapshot

    networks_converted = Networks(**networks_dict)
    assert isinstance(networks_converted, Networks)
    assert networks_converted == snapshot(
        name="networks-dict-converted",
    )
