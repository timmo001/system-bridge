"""System Bridge: Main class"""
import asyncio

from .base import Base


class Main(Base):
    """Main class"""

    def __init__(
        self,
    ) -> None:
        """Initialize the main class"""
        super().__init__()

        self.logger.info("----------------------------------------------------")
        self.logger.info("System Bridge")
        self.logger.info("----------------------------------------------------")

        asyncio.run(self.setup())

    async def setup(self) -> None:
        """Setup application"""
        self.logger.info("Setup application")
