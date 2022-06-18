"""System Bridge GUI: Worker"""
import asyncio
from cmath import e
import sys
import time

from PySide6.QtCore import QRunnable, Slot
from PySide6.QtWidgets import QApplication, QMessageBox
import async_timeout
from systembridgeshared.base import Base
from systembridgeshared.const import MODEL_CPU, MODEL_SYSTEM
from systembridgeshared.exceptions import (
    AuthenticationException,
    ConnectionClosedException,
    ConnectionErrorException,
)
from systembridgeshared.websocket_client import WebSocketClient

from systembridgegui.widgets.timed_message_box import TimedMessageBox

MODULES = [
    MODEL_CPU,
    MODEL_SYSTEM,
]


class Worker(Base, QRunnable):
    """Worker thread"""

    def __init__(
        self,
        application: QApplication,
        websocket_client: WebSocketClient,
    ):
        """Initialize"""
        Base.__init__(self)
        QRunnable.__init__(self)

        self._application = application
        self._websocket_client = websocket_client

    @Slot()  # QtCore.Slot
    def run(self):
        """Run"""
        self._logger.info("Starting worker thread")
        # Setup WebSocket
        asyncio.run(self._setup_websocket())

    async def _callback_module_update(
        self,
        module_name: str,
        module,
    ) -> None:
        """Handle data from the WebSocket client."""
        self._logger.info("New data for: %s", module_name)
        # setattr(self.systembridge_data, module_name, module)

    def _connection_error(
        self,
        message: str,
    ) -> None:
        """Handle a connection error"""
        error_message = TimedMessageBox(
            10,
            f"{message} Exiting in",
        )
        error_message.setIcon(QMessageBox.Critical)
        error_message.setWindowTitle("Error")
        error_message.exec()
        # Exit cleanly
        self._logger.info("Exit GUI..")
        self._application.quit()
        sys.exit(1)

    async def _setup_websocket(self) -> None:
        """Setup the WebSocket client"""
        try:
            async with async_timeout.timeout(20):
                await self._websocket_client.connect()
        except AuthenticationException as exception:
            self._logger.error("Authentication failed: %s", exception)
            self._connection_error("Authentication failed!")
        except ConnectionErrorException as exception:
            self._logger.error("Could not connect to WebSocket: %s", exception)
            self._connection_error("Could not connect to WebSocket!")
        except asyncio.TimeoutError as exception:
            self._logger.error("Connection timeout to WebSocket: %s", exception)
            self._connection_error("Connection timeout to WebSocket!")

        await self._listen_for_data()

    async def _listen_for_data(self) -> None:
        """Listen for data from the WebSocket client"""
        try:
            asyncio.create_task(
                self._websocket_client.listen(
                    callback=self._callback_module_update,
                    accept_other_types=True,
                )
            )
            await self._websocket_client.get_data(MODULES)
            await self._websocket_client.register_data_listener(MODULES)
        except AuthenticationException as exception:
            self._logger.error("Authentication failed: %s", exception)
            self._connection_error("Authentication failed!")
        except (ConnectionClosedException, ConnectionResetError) as exception:
            self._logger.warning(
                "WebSocket connection closed. Will retry: %s", exception
            )
            await self._setup_websocket()
        except ConnectionErrorException as exception:
            self._logger.warning(
                "WebSocket connection error occurred. Will retry: %s",
                exception,
            )
            await self._setup_websocket()
