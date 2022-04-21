"""System Bridge: Server"""
from datetime import timedelta
from os import walk

from sanic import Sanic
from sanic.request import Request
from sanic.response import HTTPResponse, json
from sanic_scheduler import SanicScheduler, task

from systembridgebackend import Base
from systembridgebackend.database import Database
from systembridgebackend.modules.update import Update
from systembridgebackend.server.auth import ApiKeyAuthentication
from systembridgebackend.server.keyboard import handler_keyboard
from systembridgebackend.server.mdns import MDNSAdvertisement
from systembridgebackend.server.notification import handler_notification
from systembridgebackend.server.open import handler_open
from systembridgebackend.settings import Settings, SECRET_API_KEY, SETTING_PORT_API


class Server(Base):
    """Server"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._settings = settings
        self._server = Sanic("SystemBridge")

        auth = ApiKeyAuthentication(
            app=self._server,
            header="api-key",
            keys=[self._settings.get_secret(SECRET_API_KEY)],
        )

        scheduler = SanicScheduler(self._server, utc=True)
        update = Update(self._database)

        mdns_advertisement = MDNSAdvertisement(self._settings)
        mdns_advertisement.advertise_server()

        for _, dirs, _ in walk("systembridgebackend/modules"):
            implemented_modules = list(filter(lambda d: "__" not in d, dirs))
            break

        @task(timedelta(seconds=30))
        async def update_frequent_data(_) -> None:
            await update.update_frequent_data()

        @task(timedelta(minutes=2))
        async def update_data(_) -> None:
            await update.update_data()

        @auth.key_required
        async def handler_data_all(
            _: Request,
            table: str,
        ) -> HTTPResponse:
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)
            return json(self._database.table_data_to_ordered_dict(table))

        @auth.key_required
        async def handler_data_by_key(
            _: Request,
            table: str,
            key: str,
        ) -> HTTPResponse:
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)

            data = self._database.read_table_by_key(table, key).to_dict(
                orient="records"
            )[0]
            return json(
                {
                    data["key"]: data["value"],
                    "last_updated": data["timestamp"],
                }
            )

        @auth.key_required
        async def handler_generic(
            request: Request,
            function: callable,
        ) -> HTTPResponse:
            return await function(request)

        self._logger.info(scheduler.task_info())
        self._server.add_route(
            handler_data_all,
            "/api/data/<table:str>",
            methods=["GET"],
        )
        self._server.add_route(
            handler_data_by_key,
            "/api/data/<table:str>/<key:str>",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_keyboard),
            "/api/keyboard",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_notification),
            "/api/notification",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_open),
            "/api/open",
            methods=["POST"],
        )

        # self._server.static("/", "./frontend/dist/")
        # self._server.add_websocket_route(websocket, "/api/websocket")

    def start(self) -> None:
        """Start Server"""
        self._logger.info("Starting server")
        self._server.run(
            host="0.0.0.0",
            port=self._settings.get(SETTING_PORT_API),
            debug=True,
            motd=False,
        )
