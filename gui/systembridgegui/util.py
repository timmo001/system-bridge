"""System Bridge GUI: Util"""
import asyncio


def get_or_create_event_loop() -> asyncio.AbstractEventLoop:
    """Get or Create Event Loop"""
    try:
        return asyncio.get_event_loop()
    except RuntimeError as ex:
        if "There is no current event loop in thread" in str(ex):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return asyncio.get_event_loop()
