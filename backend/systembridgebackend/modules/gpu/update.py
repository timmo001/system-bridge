"""System Bridge: Update GPU"""
import asyncio
from json import dumps

from systembridgeshared.common import make_key
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import GPU as DatabaseModel

from . import GPU
from ..base import ModuleUpdateBase


class GPUUpdate(ModuleUpdateBase):
    """GPU Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._gpu = GPU()

    async def update_name(
        self,
        gpu_key: str,
        gpu_name: str,
    ) -> None:
        """Update name"""
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_name",
                value=gpu_name,
            ),
        )

    async def update_core_clock(
        self,
        gpu_key: str,
    ) -> None:
        """Update core clock"""
        value = self._gpu.core_clock(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_core_clock",
                value=str(value) if value else None,
            ),
        )

    async def update_core_load(
        self,
        gpu_key: str,
    ) -> None:
        """Update core load"""
        value = self._gpu.core_load(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_core_load",
                value=str(value) if value else None,
            ),
        )

    async def update_fan_speed(
        self,
        gpu_key: str,
    ) -> None:
        """Update fan speed"""
        value = self._gpu.fan_speed(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_fan_speed",
                value=str(value) if value else None,
            ),
        )

    async def update_memory_clock(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory clock"""
        value = self._gpu.memory_clock(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_memory_clock",
                value=str(value) if value else None,
            ),
        )

    async def update_memory_load(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory load"""
        value = self._gpu.memory_load(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_memory_load",
                value=str(value) if value else None,
            ),
        )

    async def update_memory_free(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory free"""
        value = self._gpu.memory_free(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_memory_free",
                value=str(value) if value else None,
            ),
        )

    async def update_memory_used(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory used"""
        value = self._gpu.memory_used(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_memory_used",
                value=str(value) if value else None,
            ),
        )

    async def update_memory_total(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory total"""
        value = self._gpu.memory_total(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_memory_total",
                value=str(value) if value else None,
            ),
        )

    async def update_power(
        self,
        gpu_key: str,
    ) -> None:
        """Update power"""
        value = self._gpu.power(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_power",
                value=str(value) if value else None,
            ),
        )

    async def update_temperature(
        self,
        gpu_key: str,
    ) -> None:
        """Update temperature"""
        value = self._gpu.temperature(self._database, gpu_key)
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key=f"{gpu_key}_temperature",
                value=str(value) if value else None,
            ),
        )

    async def update_all_data(self) -> None:
        """Update data"""

        # Clear table in case of hardware changes since last run
        self._database.clear_table(DatabaseModel)

        gpu_list = []
        for gpu_name in self._gpu.get_gpus(self._database):
            gpu_key = make_key(gpu_name)
            gpu_list.append(gpu_key)
            await asyncio.gather(
                *[
                    self.update_name(gpu_key, gpu_name),
                    self.update_core_clock(gpu_key),
                    self.update_core_load(gpu_key),
                    self.update_fan_speed(gpu_key),
                    self.update_memory_clock(gpu_key),
                    self.update_memory_load(gpu_key),
                    self.update_memory_free(gpu_key),
                    self.update_memory_used(gpu_key),
                    self.update_memory_total(gpu_key),
                    self.update_power(gpu_key),
                    self.update_temperature(gpu_key),
                ]
            )
        self._database.update_data(
            DatabaseModel,
            DatabaseModel(
                key="gpus",
                value=dumps(gpu_list),
            ),
        )
