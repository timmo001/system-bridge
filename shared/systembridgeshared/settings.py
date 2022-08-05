"""System Bridge: Settings"""
from __future__ import annotations

import io
import os
from os.path import exists
from typing import Any, Union
from uuid import uuid4

from appdirs import AppDirs
from cryptography.fernet import Fernet

from systembridgeshared.base import Base
from systembridgeshared.common import convert_string_to_correct_type
from systembridgeshared.const import (
    SECRET_API_KEY,
    SETTING_ADDITIONAL_MEDIA_DIRECTORIES,
    SETTING_AUTOSTART,
    SETTING_LOG_LEVEL,
    SETTING_PORT_API,
)
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import (
    Data as DatabaseData,
    Secrets as DatabaseSecrets,
    Settings as DatabaseSettings,
)


class Settings(Base):
    """Settings"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database

        # Generate default encryption key
        self._encryption_key: str = ""
        secret_key_path = os.path.join(
            AppDirs("systembridge", "timmo001").user_data_dir, "secret.key"
        )
        if exists(secret_key_path):
            with io.open(secret_key_path, encoding="utf-8") as file:
                self._encryption_key = file.read().splitlines()[0]
        if not self._encryption_key:
            self._encryption_key = Fernet.generate_key().decode()
            with io.open(secret_key_path, "w", encoding="utf-8") as file:
                file.write(self._encryption_key)

        # Default Secrets
        if (
            self._database.get_data_item_by_key(DatabaseSecrets, SECRET_API_KEY)
            is not None
        ):
            self.set_secret(SECRET_API_KEY, str(uuid4()))

        # Default Settings
        if (
            self._database.get_data_item_by_key(DatabaseSettings, SETTING_AUTOSTART)
            is not None
        ):
            self.set(SETTING_AUTOSTART, False)
        if (
            self._database.get_data_item_by_key(DatabaseSettings, SETTING_LOG_LEVEL)
            is not None
        ):
            self.set(SETTING_LOG_LEVEL, "INFO")
        if (
            self._database.get_data_item_by_key(DatabaseSettings, SETTING_PORT_API)
            is not None
        ):
            self.set(SETTING_PORT_API, 9170)
        if (
            self._database.get_data_item_by_key(
                DatabaseSettings, SETTING_ADDITIONAL_MEDIA_DIRECTORIES
            )
            is not None
        ):
            self.set(SETTING_ADDITIONAL_MEDIA_DIRECTORIES, [])

    def get_all(self) -> list[DatabaseData]:
        """Get settings"""
        records = self._database.get_data(DatabaseSettings)
        # for record in records:
        #     if record.value is not None:
        #         record.value = convert_string_to_correct_type(record.value)
        return records

    def get(
        self,
        key: str,
    ) -> Union[bool, float, int, str, list[Any], dict[str, Any], None]:
        """Get setting"""
        record = self._database.get_data_item_by_key(DatabaseSettings, key)
        if record is None or record.value is None:
            return None
        return convert_string_to_correct_type(record.value)

    def get_secret(
        self,
        key: str,
    ) -> str:
        """Get secret"""
        record = self._database.get_data_item_by_key(DatabaseSecrets, key)
        if record is None or record.value is None:
            raise KeyError(f"Secret {key} not found")

        secret = record.value
        fernet = Fernet(self._encryption_key)
        return fernet.decrypt(secret.encode()).decode()

    def set(
        self,
        key: str,
        value: Union[bool, float, int, str, list[Any], dict[str, Any], None],
    ) -> None:
        """Set setting"""
        self._database.add_data(
            self._database.create_data(
                key,
                value,
            )
        )

    def set_secret(
        self,
        key: str,
        value: str,
    ) -> None:
        """Set secret"""
        fernet = Fernet(self._encryption_key)

        self._database.add_data(
            self._database.create_data(
                key,
                fernet.encrypt(value.encode()).decode(),
            )
        )
