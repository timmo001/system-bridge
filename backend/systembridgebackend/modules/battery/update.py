"""System Bridge: Update Battery"""
import asyncio

from sqlmodel import Session, select
from systembridgeshared.common import camel_to_snake
from systembridgeshared.database import Database
from systembridgeshared.models.database_data import Battery as DatabaseModel

from . import Battery
from ..base import ModuleUpdateBase


class BatteryUpdate(ModuleUpdateBase):
    """Battery Update"""

    def __init__(
        self,
        database: Database,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._battery = Battery()

    def _update_data(
        self,
        session: Session,
        data: DatabaseModel,
    ) -> None:
        """Update data"""
        result = session.exec(
            select(DatabaseModel).where(DatabaseModel.key == data.key)
        )
        old_data = result.first()
        if old_data is None:
            session.add(data)
        else:
            session.refresh(data)

    async def update_sensors(
        self,
        session: Session,
    ) -> None:
        """Update Battery Sensors"""
        if data := self._battery.sensors():
            for key, value in data._asdict().items():
                # From status
                if key == "percent":
                    continue
                self._update_data(
                    session,
                    DatabaseModel(
                        key="sensors_{key}",
                        value=value,
                    ),
                )

    async def update_status(
        self,
        session: Session,
    ) -> None:
        """Update Battery Status"""
        for key, value in self._battery.status().items():
            self._update_data(
                session,
                DatabaseModel(
                    key=camel_to_snake(key),
                    value=value,
                ),
            )

    async def update_all_data(self) -> None:
        """Update data"""
        session = self._database.get_session()
        await asyncio.gather(
            *[
                self.update_sensors(session),
                self.update_status(session),
            ]
        )
        session.commit()
        session.close()
