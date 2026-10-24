---
title: Data
description: Request module data, subscribe to live updates, and handle the data messages over the WebSocket API.
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

## Getting history

System Bridge keeps up to the last 24 hours of the graphed readings and keeps them through restarts. It records about one a minute of each:

- CPU usage, temperature, frequency, power and load average
- Memory, swap and battery
- System power
- Network and disk rates, and each disk's temperature
- Each GPU's core and memory load, temperature and power
- Each temperature sensor and fan speed

Readings a system doesn't report are left out.

Send the `GET_HISTORY` event to get them. With no data it returns everything it holds. Pass `since`, in Unix milliseconds, to get only readings taken after that time, such as the newest one you already have.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_HISTORY",
    "data": { "since": 1761300000000 }
}
```

It responds with the `HISTORY` type. Each series is a list of readings, oldest first, with `time` in Unix milliseconds. Usage and loads are percentages, temperatures are in °C, frequency is in MHz, power is in watts and fan speeds are in RPM. Network and disk values are rates in bytes per second. Disks are listed by name, and sensors and fans by their key.

```json title="Response"
{
    "id": "abc123",
    "type": "HISTORY",
    "subtype": "NONE",
    "data": {
        "cpu": [
            { "time": 1761300060000, "value": 12.5 },
            { "time": 1761300120000, "value": 18.2 }
        ],
        "cpu_temperature": [{ "time": 1761300060000, "value": 61 }],
        "cpu_frequency": [{ "time": 1761300060000, "value": 4850 }],
        "cpu_power": [{ "time": 1761300060000, "value": 65.2 }],
        "load_average": [{ "time": 1761300060000, "value": 1.8 }],
        "memory": [{ "time": 1761300060000, "value": 48.1 }],
        "swap": [],
        "battery": [],
        "system_power": [],
        "network_receive": [{ "time": 1761300060000, "value": 20480 }],
        "network_send": [{ "time": 1761300060000, "value": 5120 }],
        "disk_read": [],
        "disk_write": [],
        "disk_temperatures": [
            {
                "id": "nvme0n1",
                "samples": [{ "time": 1761300060000, "value": 42 }]
            }
        ],
        "gpus": [
            {
                "id": "gpu0",
                "core_load": [{ "time": 1761300060000, "value": 7 }],
                "memory_load": [{ "time": 1761300060000, "value": 31.5 }],
                "temperature": [{ "time": 1761300060000, "value": 48 }],
                "power": [{ "time": 1761300060000, "value": 21.4 }]
            }
        ],
        "temperatures": [],
        "fans": [
            {
                "id": "nct6799_fan2",
                "samples": [{ "time": 1761300060000, "value": 1180 }]
            }
        ]
    },
    "message": "Got history"
}
```
