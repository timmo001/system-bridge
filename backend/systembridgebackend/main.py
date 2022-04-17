"""System Bridge: Main class"""
import asyncio

from systembridgebackend.base import Base
from systembridgebackend.database import Database
from systembridgebackend.modules.cpu.update import CPUUpdate


class Main(Base):
    """Main class"""

    def __init__(self) -> None:
        """Initialize the main class"""
        super().__init__()

        self._database = Database()

        self._logger.info("----------------------------------------------------")
        self._logger.info("System Bridge")
        self._logger.info("----------------------------------------------------")

        asyncio.run(self.setup())

    async def setup(self) -> None:
        """Setup application"""
        self._logger.info("Setup application")
        if not self._database.connected:
            self._database.connect()

        update_cpu = CPUUpdate(self._database)
        await update_cpu.update_all_data()

        self._logger.info(self._database.read_table("cpu").to_json(orient="records"))
