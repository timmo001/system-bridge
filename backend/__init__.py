"""System Bridge"""
import logging
import os
from appdirs import AppDirs

from systembridgebackend.main import Main

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
FORMAT = "%(asctime)s %(levelname)s (%(threadName)s) [%(name)s] %(message)s"

if __name__ == "__main__":
    user_data_dir = AppDirs("systembridge", "timmo001").user_data_dir

    # Create User Data Directories
    os.makedirs(user_data_dir, exist_ok=True)

    logging.basicConfig(
        datefmt=DATE_FORMAT,
        format=FORMAT,
        handlers=[
            logging.FileHandler(os.path.join(user_data_dir, "system-bridge.log")),
        ],
        level=logging.INFO,
    )

    Main()
