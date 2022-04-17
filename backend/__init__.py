"""System Bridge"""
from argparse import ArgumentParser
import logging

from systembridgegui.main import Main

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "-ah",
        "--host",
        dest="hostname",
        help="API Hostname",
        default="localhost",
    )
    parser.add_argument(
        "-ak",
        "--api-key",
        dest="api_key",
        help="API key",
    )
    parser.add_argument(
        "-ap",
        "--api-port",
        dest="port",
        help="API Port",
        default=9170,
    )
    parser.add_argument(
        "-fp",
        "--frontend-port",
        dest="frontend_port",
        help="Frontend Port",
        default=9170,
    )
    parser.add_argument(
        "-ll",
        "--log-level",
        dest="log_level",
        help="Log level",
        default="INFO",
    )
    parser.add_argument(
        "-wp",
        "--websocket-port",
        dest="websocket_port",
        help="WebSocket Port",
        default=9172,
    )

    args = parser.parse_args()

    logging.basicConfig(
        format=FORMAT,
        datefmt=DATE_FORMAT,
        level=args.log_level.upper(),
    )
    logger = logging.getLogger(__name__)

    Main(args)
