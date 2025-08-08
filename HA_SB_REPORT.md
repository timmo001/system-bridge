### System Bridge ↔ Home Assistant Integration Compliance Report

#### Overview

Goal: Verify that System Bridge’s emitted data, units, and semantics match the Home Assistant (HA) “System Bridge” integration’s expectations/documentation.

Primary reference: Home Assistant docs for System Bridge [System Bridge Integration docs](https://www.home-assistant.io/integrations/system_bridge/).

#### Inputs Reviewed

- Backend (this repo):
  - Data contracts: `types/*.go`
  - Module emitters: `data/module/*`
  - WebSocket contracts: `backend/websocket/*`, `event/event_types.go`
- Home Assistant integration (cloned to `./temp/core/homeassistant/components/system_bridge/`):
  - Entities and units: `sensor.py`, `binary_sensor.py`, `media_player.py`, `update.py`
  - Data coordinator: `coordinator.py`, constants: `const.py`, services: `services.yaml`
- Connector library (cloned to `./temp/system-bridge-connector`):
  - Request/response mappings: `systembridgeconnector/websocket_client.py`, `const.py`
- Live data sample:
  - Executed `go run . client data run --all --pretty` and validated JSON shape/values.

#### High-level result

- Most modules align with HA integration expectations for field names, value ranges, and units.
- Remaining mismatches to address:
  - GPU memory units (docs say GB; integration surfaces MB)
  - Media player doc vs integration (Windows-only in docs vs general availability in integration)

Below is a detailed, per-domain assessment.

### Per-module findings

- Battery

  - Backend emits: `is_charging` (bool), `percentage` (0–100), `time_remaining` (seconds); `types/battery.go`, `data/module/battery.go`.
  - HA uses:
    - Battery level as PERCENTAGE
    - Time remaining converted to timestamp
  - Status: Matches.

- CPU

  - Backend emits: `frequency.current|min|max` (MHz), `usage` (%), `temperature` (°C), `voltage` (V), `power` (W), `per_cpu[].usage` (%), `per_cpu[].power` (W); `types/cpu.go`, `data/module/cpu.go` (+ OS files).
  - HA uses:
    - CPU speed converted to GHz by dividing MHz/1000
    - CPU package/core power in W
    - CPU temperature °C, voltage V
    - Load sensors map to `%`
  - Status: Matches.

- Memory

  - Backend emits: totals/used/free in bytes, percent in `virtual.percent`; `types/memory.go`, `data/module/memory.go`.
  - HA uses GB (decimal 1000^3) and `%` for “used percentage”.
  - Status: Matches.

- Disks

  - Backend emits: per-device partitions with `usage.percent` (%); `types/disks.go`, `data/module/disks.go`.
  - HA exposes “Filesystem(s)” sensors as `% used` (per partition).
  - Status: Matches.

- Displays

  - Backend (Linux) emits: `resolution_horizontal/vertical` (px), `refresh_rate` (Hz), `pixel_clock` (MHz); `data/module/displays/displays_linux.go`.
  - HA exposes:
    - X/Y resolution (unit “px”)
    - Refresh rate in Hertz
  - Status: Fixed in backend (Linux): `refresh_rate` now in Hz and `pixel_clock` in MHz.

- GPUs

  - Backend (Linux/NVIDIA via `nvidia-smi`) emits:
    - Memory totals/used/free in MiB, clocks in MHz, power in W, temperature in °C, load in %; `data/module/gpus/gpus_linux.go`.
  - HA “Sensors” shows:
    - GPU memory free/used in MEGABYTES (decimal), GPU usage %; HA does not convert to GB.
  - Docs vs integration:
    - Docs say “GPU Memory Free … in GB”
    - Integration publishes MB (and underlying MiB)
  - Status: Units mismatch with docs; either update docs to MB or change integration to convert to GB.

- Networks

  - Backend emits `connections`, `io`, `networks` data; `types/networks.go`, `data/module/networks.go`.
  - HA integration does not expose network sensors; no doc claims for network sensors.
  - Status: No conflict.

- Processes

  - Backend emits `id`, `name`, `cpu_usage` (%), `created` (seconds), `memory_usage` (fraction 0–1), `path`, `status`, `username`, `working_directory`; `types/processes.go`, `data/module/processes.go`.
  - HA sensors:
    - `processes_count`: number of processes
    - “Load” uses `cpu.usage` %, not UNIX-style 1m load avg
  - Status: Matches docs’ “Load” meaning (“System load percentage”).

- Sensors (temperatures/windows)

  - Backend emits `temperatures` when available, `windows_sensors` as empty stub for compatibility; `data/module/sensors/*`.
  - HA doesn’t expose these directly as separate HA sensors in this integration.
  - Status: No conflict.

- System

  - Backend emits: `boot_time`, `platform`, `platform_version`, `kernel_version`, `uptime`, IP/MAC, `version`, `version_latest`, `version_newer_available`; `types/system.go`, `data/module/system.go`.
  - Optional support (Linux): populate `camera_usage` and `pending_reboot` when detectable.
  - Status: Backend updated to include `kernel_version` and best-effort optional flags.

- Media player

  - Backend provides media data on Linux via `playerctl` best-effort; `data/module/media/media_linux.go`.
  - HA creates a media player entity when `.media` present (no platform gating).
  - Docs state “This is currently only supported devices running System Bridge on Windows.”
  - Status: Docs vs integration mismatch. Either gate by platform or update docs.

- Notification service and Actions
  - Connector mappings match backend events (`OPEN`, `NOTIFICATION`, `POWER_*`, `GET_*`, `REGISTER_DATA_LISTENER`, `DATA_UPDATE`, etc.).
  - Our backend WebSocket/event router matches event names and response types; `event/event_types.go`, `backend/websocket`.
  - Status: Matches.

### Validation of live data

- Ran CLI: `go run . client data run --all --pretty` and validated:
  - Top-level keys match HA’s `const.MODULES`: `battery`, `cpu`, `disks`, `displays`, `gpus`, `media`, `memory`, `processes`, `system`. `networks` and `sensors` also present; HA ignores `networks`, partially ignores `sensors`.
  - Used `jq` assertions to validate required shapes, presence, and key value types (numbers, arrays, objects).
  - Spot-checks: `system.run_mode="standalone"`, `system.version="5.0.0"`, memory virtual totals numeric, per-CPU frequency/usage present, partition usage `%`.

### Recommendations

- GPU memory units

  - Align docs with integration’s MB (or change integration to convert MiB→GB and adjust unit to GB).

- Media player platform note

  - Either gate entity creation in HA to Windows only, or update docs to indicate “best-effort” on Linux where media is available.

// Optional system flags implemented on Linux (best-effort)
