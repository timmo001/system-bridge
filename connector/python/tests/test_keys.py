"""Test client keys against the spec's vectors.

key-test-vectors.json is a copy of Groundwork's packages/auth/test-vectors.json,
shared by every implementation of the client keys spec:
https://github.com/timmo001/groundwork/blob/main/packages/auth/test-vectors.json
"""

from json import loads
from pathlib import Path
import zlib

import pytest

from systembridgeconnector.keys import hash_key, is_client_key, key_checksum, parse_key

VECTORS = loads((Path(__file__).parent / "key-test-vectors.json").read_text())


def test_crc32_check() -> None:
    """Test the CRC32 is the IEEE one the spec names."""
    check = VECTORS["crc32Check"]
    assert zlib.crc32(check["input"].encode()) == check["crc32"]


@pytest.mark.parametrize("vector", VECTORS["valid"], ids=lambda v: v["key"])
def test_valid_key(vector: dict) -> None:
    """Test a valid key parses into its parts, with its checksum and hash."""
    parsed = parse_key(vector["key"])
    assert parsed is not None
    assert parsed.service == vector["service"]
    assert parsed.kind == vector["kind"]
    assert parsed.random == vector["random"]
    assert parsed.checksum == vector["checksum"]
    assert key_checksum(vector["key"][:-6]) == vector["checksum"]
    assert zlib.crc32(vector["key"][:-6].encode()) == vector["crc32"]
    assert hash_key(vector["key"]) == vector["sha256"]


@pytest.mark.parametrize("vector", VECTORS["invalid"], ids=lambda v: v["reason"])
def test_invalid_key(vector: dict) -> None:
    """Test a key that isn't valid is turned away."""
    assert parse_key(vector["key"]) is None


def test_is_client_key() -> None:
    """Test only a System Bridge key counts, not the old token or another's."""
    keys = {vector["service"]: vector["key"] for vector in VECTORS["valid"]}
    assert is_client_key(keys["system-bridge"])
    assert not is_client_key(keys["kestrel"])
    assert not is_client_key("0f8e2c41-7d5a-4b8e-9c1d-2a3b4c5d6e7f")
