"""System Bridge Frontend"""
import os

from systembridgeshared.base import Base


class Frontend(Base):
    """Frontend"""

    def get_frontend_path(self) -> str:
        """Get frontend path (absolute)"""
        return os.path.abspath(
            os.path.join(os.path.dirname(__file__), "out"),
        )
