"""Test the modules model."""

from systembridgeconnector.models.modules import (
    GetData,
    Module,
    ModulesData,
    RegisterDataListener,
)

modules = [
    Module.BATTERY,
    Module.CPU,
    Module.DISKS,
    Module.DISPLAYS,
    Module.GPUS,
    Module.MEDIA,
    Module.MEMORY,
    Module.NETWORKS,
    Module.PROCESSES,
    Module.SENSORS,
    Module.SYSTEM,
]


def test_get_data():
    """Test get data."""
    get_data = GetData(
        modules=modules,
    )
    assert isinstance(get_data, GetData)
    assert get_data.modules == modules


def test_register_data_listener():
    """Test register data listener."""
    register_data_listener = RegisterDataListener(
        modules=modules,
    )
    assert isinstance(register_data_listener, RegisterDataListener)
    assert register_data_listener.modules == modules


def test_modules_data():
    """Test modules data."""
    modules_data = ModulesData()
    assert isinstance(modules_data, ModulesData)
    assert modules_data.battery is None
    assert modules_data.cpu is None
    assert modules_data.disks is None
    assert modules_data.displays is None
    assert modules_data.gpus is None
    assert modules_data.media is None
    assert modules_data.memory is None
    assert modules_data.networks is None
    assert modules_data.processes is None
    assert modules_data.sensors is None
    assert modules_data.system is None
