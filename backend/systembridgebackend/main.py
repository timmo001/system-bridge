"""System Bridge: Main class"""
import asyncio

from systembridgebackend.base import Base
from systembridgebackend.modules.cpu import CPU


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
        cpu = CPU()
        self.call_all_public_functions(cpu)

    def call_all_public_functions(self, x) -> None:
        """Call all functions"""
        public_method_names = [
            method
            for method in dir(x)
            if callable(getattr(x, method))
            if not method.startswith("_")
        ]  # 'private' methods start from _
        for method in public_method_names:
            self.logger.info("%s: %s", method, getattr(x, method)())
