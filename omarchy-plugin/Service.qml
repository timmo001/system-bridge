import QtQuick
import Quickshell.Io

Item {
  id: root

  property var shell: null
  property bool connected: false
  property double lastUpdateAt: 0
  property double currentTime: Date.now()
  property var cpuUsage: null
  property var cpuLoad: null
  property var cpuTemperature: null
  property var memoryPercent: null
  property var memoryUsed: null
  property var memoryTotal: null
  property var rootDisk: null
  property var sensorTemperatures: []
  property var fans: []
  property var gpus: []
  property var hottestTemperature: null
  property string hottestSensor: ""
  property var hottestHigh: null
  property var hottestCritical: null
  property bool reportedHighTemperature: false
  property bool reportedCriticalTemperature: false
  property var uptime: null
  property string hostname: ""
  property string installedVersion: ""
  property string latestVersion: ""
  property var newerVersionAvailable: null
  property var pendingReboot: null
  property var batteryPercentage: null
  property var batteryCharging: null
  property var batteryTimeRemaining: null

  readonly property bool stale: connected && lastUpdateAt > 0
    && currentTime - lastUpdateAt >= 120000
  readonly property bool highTemperature: reportedHighTemperature
  readonly property bool criticalTemperature: reportedCriticalTemperature

  function numberOrNull(value) {
    if (value === undefined || value === null || value === "") return null
    var number = Number(value)
    return isFinite(number) ? number : null
  }

  function objectData(value) {
    return value && typeof value === "object" && !Array.isArray(value)
  }

  function updateHottest() {
    var hottest = null
    var high = false
    var critical = false
    if (cpuTemperature !== null) {
      hottest = { label: "CPU", temperature: cpuTemperature, high: null, critical: null }
    }
    for (var i = 0; i < sensorTemperatures.length; i++) {
      var sensor = sensorTemperatures[i]
      var temperature = numberOrNull(sensor.temperature)
      var highThreshold = numberOrNull(sensor.high)
      var criticalThreshold = numberOrNull(sensor.critical)
      if (temperature !== null && highThreshold !== null && highThreshold > 0
          && temperature >= highThreshold) high = true
      if (temperature !== null && criticalThreshold !== null && criticalThreshold > 0
          && temperature >= criticalThreshold) critical = true
      if (temperature === null || (hottest && temperature <= hottest.temperature)) continue
      hottest = {
        label: String(sensor.key || "Sensor"),
        temperature: temperature,
        high: highThreshold,
        critical: criticalThreshold
      }
    }
    hottestTemperature = hottest ? hottest.temperature : null
    hottestSensor = hottest ? hottest.label : ""
    hottestHigh = hottest ? hottest.high : null
    hottestCritical = hottest ? hottest.critical : null
    reportedHighTemperature = high
    reportedCriticalTemperature = critical
  }

  function applyLine(line) {
    try {
      var payload = JSON.parse(String(line || "").trim())
      if (!payload || payload.type !== "DATA_UPDATE") return
      var data = payload.data
      if (payload.module === "gpus" ? !Array.isArray(data) : !objectData(data)) return
      if (payload.module === "cpu") {
        if (data.usage === undefined && data.load_average === undefined
            && data.temperature === undefined) return
        var nextCpuUsage = numberOrNull(data.usage)
        var nextCpuLoad = numberOrNull(data.load_average)
        var nextCpuTemperature = numberOrNull(data.temperature)
        if ((data.usage !== undefined && data.usage !== null && nextCpuUsage === null)
            || (data.load_average !== undefined && data.load_average !== null && nextCpuLoad === null)
            || (data.temperature !== undefined && data.temperature !== null && nextCpuTemperature === null)) return
        cpuUsage = nextCpuUsage
        cpuLoad = nextCpuLoad
        cpuTemperature = nextCpuTemperature
        updateHottest()
      } else if (payload.module === "memory") {
        if (!objectData(data.virtual)) return
        var nextMemoryPercent = numberOrNull(data.virtual.percent)
        var nextMemoryUsed = numberOrNull(data.virtual.used)
        var nextMemoryTotal = numberOrNull(data.virtual.total)
        if ((data.virtual.percent !== undefined && data.virtual.percent !== null && nextMemoryPercent === null)
            || (data.virtual.used !== undefined && data.virtual.used !== null && nextMemoryUsed === null)
            || (data.virtual.total !== undefined && data.virtual.total !== null && nextMemoryTotal === null)) return
        memoryPercent = nextMemoryPercent
        memoryUsed = nextMemoryUsed
        memoryTotal = nextMemoryTotal
      } else if (payload.module === "disks") {
        if (!Array.isArray(data.devices)) return
        var nextRootDisk = null
        for (var deviceIndex = 0; deviceIndex < data.devices.length; deviceIndex++) {
          var device = data.devices[deviceIndex]
          if (!objectData(device) || !Array.isArray(device.partitions)) return
          for (var partitionIndex = 0; partitionIndex < device.partitions.length; partitionIndex++) {
            var partition = device.partitions[partitionIndex]
            if (!objectData(partition)) return
            if (partition.mount_point === "/" && objectData(partition.usage))
              nextRootDisk = partition
          }
        }
        rootDisk = nextRootDisk
      } else if (payload.module === "sensors") {
        if (!Array.isArray(data.temperatures) || !Array.isArray(data.fans)) return
        for (var i = 0; i < data.temperatures.length; i++) {
          var temperature = data.temperatures[i]
          if (!objectData(temperature)
              || numberOrNull(temperature.temperature) === null) return
        }
        var labelledFans = data.fans.filter(function(fan) {
          return objectData(fan) && String(fan.label || "") !== ""
        })
        labelledFans.sort(function(left, right) {
          if (left.label === "CPU Fan") return -1
          if (right.label === "CPU Fan") return 1
          return String(left.label).localeCompare(String(right.label))
        })
        sensorTemperatures = data.temperatures
        fans = labelledFans.length > 0 ? labelledFans : data.fans
        updateHottest()
      } else if (payload.module === "gpus") {
        if (!Array.isArray(data)) return
        gpus = data
      } else if (payload.module === "system") {
        if (data.uptime === undefined && data.hostname === undefined
            && data.version === undefined) return
        var nextUptime = numberOrNull(data.uptime)
        if (data.uptime !== undefined && data.uptime !== null && nextUptime === null) return
        uptime = nextUptime
        hostname = data.hostname === undefined || data.hostname === null ? "" : String(data.hostname)
        installedVersion = data.version === undefined || data.version === null ? "" : String(data.version)
        latestVersion = data.version_latest === undefined || data.version_latest === null ? "" : String(data.version_latest)
        newerVersionAvailable = typeof data.version_newer_available === "boolean" ? data.version_newer_available : null
        pendingReboot = typeof data.pending_reboot === "boolean" ? data.pending_reboot : null
      } else if (payload.module === "battery") {
        if (data.percentage === undefined && data.is_charging === undefined
            && data.time_remaining === undefined) return
        var nextBatteryPercentage = numberOrNull(data.percentage)
        var nextBatteryTimeRemaining = numberOrNull(data.time_remaining)
        if ((data.percentage !== undefined && data.percentage !== null && nextBatteryPercentage === null)
            || (data.time_remaining !== undefined && data.time_remaining !== null && nextBatteryTimeRemaining === null)) return
        batteryPercentage = nextBatteryPercentage
        batteryCharging = typeof data.is_charging === "boolean" ? data.is_charging : null
        batteryTimeRemaining = nextBatteryTimeRemaining
      } else {
        return
      }
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
    command: [
      "system-bridge", "client", "data", "watch",
      "--module", "cpu",
      "--module", "memory",
      "--module", "disks",
      "--module", "sensors",
      "--module", "gpus",
      "--module", "system",
      "--module", "battery"
    ]
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
