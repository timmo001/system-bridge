"""Test the services module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.services import FIXTURE_SERVICES
from systembridgeconnector.models.modules.services import (
    ServiceAction,
    ServiceBusy,
    ServiceError,
    ServiceItem,
    ServiceList,
    ServiceListItem,
    ServiceProvider,
    Services,
    ServiceStat,
)


def test_services(snapshot: SnapshotAssertion):
    """Test the services model."""
    services = FIXTURE_SERVICES
    assert isinstance(services, Services)
    assert services == snapshot


def test_services_dict():
    """Test the services model converts nested dicts."""
    services = Services(**asdict(FIXTURE_SERVICES))
    assert services == FIXTURE_SERVICES
    assert isinstance(services.providers[0], ServiceProvider)
    assert isinstance(services.items[0], ServiceItem)
    assert isinstance(services.items[0].stats[0], ServiceStat)
    assert isinstance(services.items[0].lists[0], ServiceList)
    assert isinstance(services.items[0].lists[0].items[0], ServiceListItem)
    assert isinstance(services.items[0].actions[1], ServiceAction)
    assert isinstance(services.busy[0], ServiceBusy)
    assert isinstance(services.errors[0], ServiceError)


def test_services_empty():
    """Test the services model with no providers, ignoring unknown keys."""
    services = Services(unknown_field="test")
    assert services.providers == []
    assert services.items == []
    assert services.busy == []
