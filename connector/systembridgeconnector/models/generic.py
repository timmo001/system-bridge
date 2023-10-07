# Generic

from __future__ import annotations

from pydantic import BaseModel, Extra, Field


class Generic(BaseModel):
    """
    Generic
    """

    class Config:
        extra = "allow"

    last_updated: dict[str, float] = Field(..., description="Last updated")
