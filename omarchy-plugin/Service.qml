import QtQuick
import Quickshell.Io

Item {
  id: root

  property var shell: null
  property bool connected: false
  property double lastUpdateAt: 0
  property double currentTime: Date.now()
  // The latest data for each module, by name, as System Bridge reports it.
  property var modules: ({})
  // Bytes per second between the last two network counters.
  property var networkReceiveRate: null
  property var networkSendRate: null
  property var lastNetworkCounters: null

  // Modules that report a list rather than an object.
  readonly property var listModules: ["gpus", "displays", "processes"]
  readonly property var watchedModules: [
    "system", "processes", "cpu", "memory", "gpus", "sensors", "battery",
    "bluetooth", "displays", "audio", "disks", "networks", "media", "discord"
  ]

  readonly property var system: objectData(modules.system) ? modules.system : null
  readonly property var cpu: objectData(modules.cpu) ? modules.cpu : null
  readonly property var memory: objectData(modules.memory) ? modules.memory : null
  readonly property var sensors: objectData(modules.sensors) ? modules.sensors : null
  readonly property var battery: objectData(modules.battery) ? modules.battery : null
  readonly property var bluetooth: objectData(modules.bluetooth) ? modules.bluetooth : null
  readonly property var audio: objectData(modules.audio) ? modules.audio : null
  readonly property var disks: objectData(modules.disks) ? modules.disks : null
  readonly property var networks: objectData(modules.networks) ? modules.networks : null
  readonly property var media: objectData(modules.media) ? modules.media : null
  readonly property var discord: objectData(modules.discord) ? modules.discord : null
  readonly property var gpus: Array.isArray(modules.gpus) ? modules.gpus : []
  readonly property var displays: Array.isArray(modules.displays) ? modules.displays : []
  readonly property var processes: Array.isArray(modules.processes) ? modules.processes : []

  readonly property var cpuUsage: numberOrNull(cpu ? cpu.usage : null)
  readonly property var cpuLoad: numberOrNull(cpu ? cpu.load_average : null)
  readonly property var cpuTemperature: numberOrNull(cpu ? cpu.temperature : null)
  readonly property var memoryPercent: numberOrNull(memory && objectData(memory.virtual) ? memory.virtual.percent : null)
  readonly property string hostname: system && system.hostname ? String(system.hostname) : ""
  readonly property var pendingReboot: system && typeof system.pending_reboot === "boolean" ? system.pending_reboot : null
  readonly property var temperatures: sensors && Array.isArray(sensors.temperatures) ? sensors.temperatures : []
  readonly property var fans: {
    var source = sensors && Array.isArray(sensors.fans) ? sensors.fans : []
    var labelled = source.filter(function(fan) { return objectData(fan) && String(fan.label || "") !== "" })
    labelled.sort(function(left, right) {
      if (left.label === "CPU Fan") return -1
      if (right.label === "CPU Fan") return 1
      return String(left.label).localeCompare(String(right.label))
    })
    return labelled.length > 0 ? labelled : source
  }

  readonly property bool stale: connected && lastUpdateAt > 0
    && currentTime - lastUpdateAt >= 120000
  readonly property bool highTemperature: temperatures.some(function(sensor) {
    return reaches(sensor.temperature, sensor.high)
  })
  readonly property bool criticalTemperature: temperatures.some(function(sensor) {
    return reaches(sensor.temperature, sensor.critical)
  })

  function numberOrNull(value) {
    if (value === undefined || value === null || value === "") return null
    var number = Number(value)
    return isFinite(number) ? number : null
  }

  function objectData(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
  }

  function reaches(value, threshold) {
    var temperature = numberOrNull(value)
    var limit = numberOrNull(threshold)
    return temperature !== null && limit !== null && limit > 0 && temperature >= limit
  }

  function updateNetworkRates(data) {
    var io = objectData(data.io) ? data.io : null
    // Newer backends work the rates out themselves
    if (io && io.bytes_recv_rate !== undefined) {
      networkReceiveRate = numberOrNull(io.bytes_recv_rate)
      networkSendRate = numberOrNull(io.bytes_sent_rate)
      lastNetworkCounters = null
      return
    }
    var received = numberOrNull(io ? io.bytes_recv : null)
    var sent = numberOrNull(io ? io.bytes_sent : null)
    var now = Date.now()
    var previous = lastNetworkCounters
    if (previous && received !== null && sent !== null && now > previous.time) {
      var seconds = (now - previous.time) / 1000
      // Counters reset when an interface goes away; skip that sample.
      networkReceiveRate = received >= previous.received ? (received - previous.received) / seconds : null
      networkSendRate = sent >= previous.sent ? (sent - previous.sent) / seconds : null
    }
    lastNetworkCounters = received === null || sent === null ? null
      : { time: now, received: received, sent: sent }
  }

  function applyLine(line) {
    try {
      var payload = JSON.parse(String(line || "").trim())
      if (!payload || payload.type !== "DATA_UPDATE") return
      var module = String(payload.module || "")
      if (watchedModules.indexOf(module) < 0) return
      var data = payload.data
      // A module with nothing to report, such as media with no player, sends null.
      if (data !== null && (listModules.indexOf(module) >= 0 ? !Array.isArray(data) : !objectData(data))) return
      if (module === "networks" && data !== null) updateNetworkRates(data)
      var next = Object.assign({}, modules)
      next[module] = data
      modules = next
      lastUpdateAt = Date.now()
      currentTime = lastUpdateAt
      connected = true
      watchdog.restart()
    } catch (error) {
      // Keep the last valid module values when one NDJSON line is malformed.
    }
  }

  Process {
    id: watchProcess
    running: true
    command: ["system-bridge", "client", "data", "watch"].concat(
      root.watchedModules.reduce(function(args, module) { return args.concat(["--module", module]) }, []))
    stdout: SplitParser {
      onRead: function(line) { root.applyLine(line) }
    }
    onRunningChanged: if (running) watchdog.restart()
    onExited: function(exitCode) {
      watchProcess.running = false
      root.connected = false
      watchdog.stop()
      restartTimer.restart()
    }
  }

  Timer {
    id: restartTimer
    interval: 5000
    repeat: false
    onTriggered: if (!watchProcess.running) watchProcess.running = true
  }

  Timer {
    id: watchdog
    interval: 150000
    repeat: false
    onTriggered: if (watchProcess.running) watchProcess.signal(15)
  }

  Timer {
    interval: 5000
    running: true
    repeat: true
    onTriggered: root.currentTime = Date.now()
  }
}
