> I run it as a service account, so it's not in my system tray when I RDP to the server

Ah, that makes sense now. The Windows media API is only available to active user accounts, not service accounts. The exception isn't handled, so the data isn't set to empty as it should be:

<https://github.com/example/project/blob/69d689e/backend/websocket.py#L614-L626>
