"""System Bridge: Update GPU"""
from systembridgeshared.common import make_key
from systembridgeshared.database import Database

from systembridgebackend.modules.base import ModuleUpdateBase
from systembridgebackend.modules.gpu import GPU


class GPUUpdate(ModuleUpdateBase):
    """GPU Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database, "gpu")
        self._gpu = GPU()

    async def update_core_clock(
        self,
        gpu_key: str,
    ) -> None:
        """Update core clock"""
        self._database.write(
            "gpu", f"{gpu_key}_core_clock", self._gpu.core_clock(self._database)
        )

    async def update_core_load(
        self,
        gpu_key: str,
    ) -> None:
        """Update core load"""
        self._database.write(
            "gpu", f"{gpu_key}_core_load", self._gpu.core_load(self._database)
        )

    async def update_fan_speed(
        self,
        gpu_key: str,
    ) -> None:
        """Update fan speed"""
        self._database.write(
            "gpu", f"{gpu_key}_fan_speed", self._gpu.fan_speed(self._database)
        )

    async def update_memory_clock(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory clock"""
        self._database.write(
            "gpu", f"{gpu_key}_memory_clock", self._gpu.memory_clock(self._database)
        )

    async def update_memory_load(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory load"""
        self._database.write(
            "gpu", f"{gpu_key}_memory_load", self._gpu.memory_load(self._database)
        )

    async def update_memory_free(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory free"""
        self._database.write(
            "gpu", f"{gpu_key}_memory_free", self._gpu.memory_free(self._database)
        )

    async def update_memory_used(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory used"""
        self._database.write(
            "gpu", f"{gpu_key}_memory_used", self._gpu.memory_used(self._database)
        )

    async def update_memory_total(
        self,
        gpu_key: str,
    ) -> None:
        """Update memory total"""
        self._database.write(
            "gpu", f"{gpu_key}_memory_total", self._gpu.memory_total(self._database)
        )

    async def update_power(
        self,
        gpu_key: str,
    ) -> None:
        """Update power"""
        self._database.write("gpu", f"{gpu_key}_power", self._gpu.power(self._database))

    async def update_temperature(
        self,
        gpu_key: str,
    ) -> None:
        """Update temperature"""
        self._database.write(
            "gpu", f"{gpu_key}_temperature", self._gpu.temperature(self._database)
        )

    async def update_all_data(self) -> None:
        """Update data"""
        for gpu_name in self._gpu.get_gpus(self._database):
            gpu_key = make_key(gpu_name)
            await self.update_core_clock(gpu_key)
            await self.update_core_load(gpu_key)
            await self.update_fan_speed(gpu_key)
            await self.update_memory_clock(gpu_key)
            await self.update_memory_load(gpu_key)
            await self.update_memory_free(gpu_key)
            await self.update_memory_used(gpu_key)
            await self.update_memory_total(gpu_key)
            await self.update_power(gpu_key)
            await self.update_temperature(gpu_key)
