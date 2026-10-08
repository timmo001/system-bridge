"""Helper functions for models."""

from dataclasses import fields


def filter_unexpected_fields(cls):
    """Filter unexpected fields from a dataclass.

    Useful when using **kwargs in __init__.
    """
    original_init = cls.__init__

    def new_init(self, *args, **kwargs):
        expected_fields = {field.name for field in fields(cls)}
        cleaned_kwargs = {
            key: value for key, value in kwargs.items() if key in expected_fields
        }
        original_init(self, *args, **cleaned_kwargs)

    cls.__init__ = new_init
    return cls
