---
title: Data
---

Request system data on demand, subscribe to live updates, and handle the messages the backend sends back.

## Requesting data

To request data, send a message with the `GET_DATA` event listing each module to receive data from.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DATA",
    "data": {
        "modules": ["system"]
    }
}
```

## Registering as a listener

To receive data whenever it changes, send the `REGISTER_DATA_LISTENER` event with each module you want to subscribe to.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "REGISTER_DATA_LISTENER",
    "data": { "modules": ["cpu", "memory", "system"] }
}
```

The backend replies with a `DATA_LISTENER_REGISTERED` response, then sends a [`DATA_UPDATE`](#receiving-data) message whenever a subscribed module changes.

To stop receiving updates, send the `UNREGISTER_DATA_LISTENER` event. It takes no data and responds with the `DATA_LISTENER_UNREGISTERED` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "UNREGISTER_DATA_LISTENER",
    "data": {}
}
```

## Receiving data

After a `GET_DATA` request or while registered as a listener, you receive messages with the `DATA_UPDATE` type.

This will look something like this:

```json title="Response"
{
    "id": "abc123",
    "type": "DATA_UPDATE",
    "subtype": "NONE",
    "data": {
        "boot_time": 1651433957.3015134,
        "fqdn": "Desktop",
        "hostname": "Desktop",
        "ip_address_4": "1.1.1.1",
        "mac_address": "aa:bb:cc:dd:ee:ff",
        "platform": "Windows",
        "platform_version": "10.0.22000",
        "uptime": 7.015625,
        "uuid": "abcd-efgh-abcd-efgh-abcd",
        "version": "5.0.2",
        "version_latest": "5.0.7",
        "version_newer_available": false
    },
    "message": "Data received",
    "module": "system"
}
```
