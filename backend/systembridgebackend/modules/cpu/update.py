"""System Bridge: Update CPU"""
import asyncio

from sqlmodel import Session
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import CPU as DatabaseModel

from . import CPU
from ..base import ModuleUpdateBase


class CPUUpdate(ModuleUpdateBase):
    """CPU Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._cpu = CPU()

    async def update_count(
        self,
        session: Session,
    ) -> None:
        """Update CPU count"""
        session.add(
            DatabaseModel(
                key="count",
                value=str(self._cpu.count()),
            )
        )

    async def update_frequency(
        self,
        session: Session,
    ) -> None:
        """Update CPU frequency"""
        for key, value in self._cpu.freq()._asdict().items():
            session.add(
                DatabaseModel(
                    key=f"frequency_{key}",
                    value=value,
                )
            )

    async def update_frequency_per_cpu(
        self,
        session: Session,
    ) -> None:
        """Update CPU frequency per CPU"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.freq_per_cpu()]:
            for key, value in data.items():
                session.add(
                    DatabaseModel(
                        key=f"frequency_{count}_{key}",
                        value=value,
                    )
                )
            count += 1

    async def update_load_average(
        self,
        session: Session,
    ) -> None:
        """Update load average"""
        avg_tuple = self._cpu.load_average()
        result = sum([avg_tuple[0], avg_tuple[1], avg_tuple[2]]) / 3
        session.add(
            DatabaseModel(
                key="load_average",
                value=str(result),
            )
        )

    async def update_stats(
        self,
        session: Session,
    ) -> None:
        """Update stats"""
        for key, value in self._cpu.stats()._asdict().items():
            session.add(
                DatabaseModel(
                    key=f"stats_{key}",
                    value=value,
                )
            )

    async def update_temperature(
        self,
        session: Session,
    ) -> None:
        """Update temperature"""
        session.add(
            DatabaseModel(
                key="temperature",
                value=str(self._cpu.temperature(self._database)),
            )
        )

    async def update_times(
        self,
        session: Session,
    ) -> None:
        """Update times"""
        for key, value in self._cpu.times()._asdict().items():
            session.add(
                DatabaseModel(
                    key=f"times_{key}",
                    value=value,
                )
            )

    async def update_times_percent(
        self,
        session: Session,
    ) -> None:
        """Update times percent"""
        for key, value in self._cpu.times_percent()._asdict().items():
            session.add(
                DatabaseModel(
                    key=f"times_percent_{key}",
                    value=value,
                )
            )

    async def update_times_per_cpu(
        self,
        session: Session,
    ) -> None:
        """Update times per CPU"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.times_per_cpu()]:
            for key, value in data.items():
                session.add(
                    DatabaseModel(
                        key=f"times_per_cpu_{count}_{key}",
                        value=value,
                    )
                )
            count += 1

    async def update_times_per_cpu_percent(
        self,
        session: Session,
    ) -> None:
        """Update times per CPU percent"""
        count = 0
        for data in [freq._asdict() for freq in self._cpu.times_per_cpu_percent()]:
            for key, value in data.items():
                session.add(
                    DatabaseModel(
                        key=f"times_per_cpu_percent_{count}_{key}",
                        value=value,
                    )
                )
            count += 1

    async def update_usage(
        self,
        session: Session,
    ) -> None:
        """Update usage"""
        session.add(
            DatabaseModel(
                key="usage",
                value=str(self._cpu.usage()),
            )
        )

    async def update_usage_per_cpu(
        self,
        session: Session,
    ) -> None:
        """Update usage per CPU"""
        count = 0
        for value in self._cpu.usage_per_cpu():
            session.add(
                DatabaseModel(
                    key=f"usage_{count}",
                    value=str(value),
                )
            )
            count += 1

    async def update_voltage(
        self,
        session: Session,
    ) -> None:
        """Update voltage"""
        session.add(
            DatabaseModel(
                key="voltage",
                value=str(self._cpu.voltage(self._database)),
            )
        )

    async def update_all_data(self) -> None:
        """Update data"""
        session = self._database.get_session()
        await asyncio.gather(
            *[
                self.update_count(session),
                self.update_frequency(session),
                self.update_frequency_per_cpu(session),
                self.update_load_average(session),
                self.update_stats(session),
                self.update_temperature(session),
                self.update_times(session),
                self.update_times_percent(session),
                self.update_times_per_cpu(session),
                self.update_times_per_cpu_percent(session),
                self.update_usage(session),
                self.update_usage_per_cpu(session),
                self.update_voltage(session),
            ]
        )
        session.commit()
        session.close()
