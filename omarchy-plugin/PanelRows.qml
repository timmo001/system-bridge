import QtQuick

// Builds the panel's rows from the service's module data: the overview, and a
// view for each module the web client has a page for. Each row is
// { key, icon, primaryText, secondaryText, section, meter, meterLevel, kind,
// target, disabled }, where kind says what selecting it does:
//   "module"  opens that module's view (target is the module name)
//   "web"     opens a web client page (target is its path)
//   "url"     opens an external link (target is the URL)
//   "control" runs a System Bridge client control (target is its argv)
QtObject {
  id: root

  // Nerd Font glyphs, escaped so editors and tools can't drop them. The module
  // icons are the Material Design Icons the web client uses.
  readonly property string audioIcon: "\u{F057E}"
  readonly property string bluetoothIcon: "\u{F00AF}"
  readonly property string cpuIcon: "\u{F0EE0}"
  readonly property string desktopIcon: "\u{F0614}"
  readonly property string discordIcon: "\u{F02CE}"
  readonly property string diskIcon: "\u{F02CA}"
  readonly property string displayIcon: "\u{F0379}"
  readonly property string gpuIcon: "\u{F0FB2}"
  readonly property string mediaIcon: "\u{F040D}"
  readonly property string memoryIcon: "\u{F035B}"
  readonly property string networkIcon: "\u{F0317}"
  readonly property string processIcon: "\u{F1577}"
  readonly property string settingsIcon: "\u{F08BB}"
  readonly property string systemIcon: "\u{F02FD}"
  readonly property string temperatureIcon: "\u{F050F}"

  // Grouped like the web client, alphabetical within each area.
  readonly property var modules: [
    { module: "desktop", label: "Desktop", icon: root.desktopIcon, area: "System" },
    { module: "processes", label: "Processes", icon: root.processIcon, area: "System" },
    { module: "system", label: "System", icon: root.systemIcon, area: "System" },
    { module: "audio", label: "Audio", icon: root.audioIcon, area: "Hardware" },
    { module: "battery", label: "Battery", icon: "\u{F0079}", area: "Hardware" },
    { module: "bluetooth", label: "Bluetooth", icon: root.bluetoothIcon, area: "Hardware" },
    { module: "cpu", label: "CPU", icon: root.cpuIcon, area: "Hardware" },
    { module: "displays", label: "Displays", icon: root.displayIcon, area: "Hardware" },
    { module: "gpus", label: "GPUs", icon: root.gpuIcon, area: "Hardware" },
    { module: "memory", label: "Memory", icon: root.memoryIcon, area: "Hardware" },
    { module: "sensors", label: "Sensors", icon: root.temperatureIcon, area: "Hardware" },
    { module: "disks", label: "Disks", icon: root.diskIcon, area: "Storage and network" },
    { module: "networks", label: "Networks", icon: root.networkIcon, area: "Storage and network" },
    { module: "discord", label: "Discord", icon: root.discordIcon, area: "Apps" },
    { module: "media", label: "Media", icon: root.mediaIcon, area: "Apps" }
  ]

  function moduleInfo(module) {
    for (var i = 0; i < modules.length; i++)
      if (modules[i].module === module) return modules[i]
    return null
  }

  function num(value) {
    if (value === undefined || value === null || value === "") return null
    var number = Number(value)
    return isFinite(number) ? number : null
  }
  function present(value) { return value !== undefined && value !== null && value !== "" }
  function text(value) { return present(value) ? String(value) : "" }
  function join(values) { return values.filter(function(value) { return value !== "" }).join(" · ") }

  function percent(value) { return num(value) === null ? "" : Math.round(num(value)) + "%" }
  function temperature(value) { return num(value) === null ? "" : Math.round(num(value)) + " °C" }
  function bytes(value) {
    var number = num(value)
    if (number === null) return ""
    var units = ["B", "KiB", "MiB", "GiB", "TiB"]
    var unit = 0
    while (Math.abs(number) >= 1024 && unit < units.length - 1) { number /= 1024; unit++ }
    return (unit === 0 ? Math.round(number) : number.toFixed(1)) + " " + units[unit]
  }
  function mebibytes(value) { return num(value) === null ? "" : bytes(num(value) * 1048576) }
  function rate(value) { return num(value) === null ? "" : bytes(value) + "/s" }
  function frequency(megahertz) {
    var number = num(megahertz)
    if (number === null) return ""
    return number >= 1000 ? (number / 1000).toFixed(2) + " GHz" : Math.round(number) + " MHz"
  }
  function watts(value) { return num(value) === null ? "" : num(value).toFixed(1) + " W" }
  function duration(seconds) {
    var number = num(seconds)
    if (number === null) return ""
    var totalMinutes = Math.floor(number / 60)
    var days = Math.floor(totalMinutes / 1440)
    var hours = Math.floor((totalMinutes % 1440) / 60)
    var minutes = totalMinutes % 60
    var values = []
    if (days > 0) values.push(days + "d")
    if (hours > 0) values.push(hours + "h")
    if (minutes > 0 || values.length === 0) values.push(minutes + "m")
    return values.join(" ")
  }
  function clock(seconds) {
    var number = num(seconds)
    if (number === null) return ""
    var total = Math.floor(number)
    var minutes = Math.floor(total / 60)
    var rest = total % 60
    return minutes + ":" + (rest < 10 ? "0" : "") + rest
  }
  function quantity(count, one, other) { return count + " " + (count === 1 ? one : (other || one + "s")) }
  function capitalised(value) {
    var word = text(value)
    return word === "" ? "" : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }
  function yesNo(value) { return value === true ? "Yes" : (value === false ? "No" : "") }

  // The level a meter shows: inverted meters, like battery charge, warn low.
  function level(value, warning, danger, inverted) {
    var number = num(value)
    if (number === null) return "normal"
    if (inverted) return number <= danger ? "danger" : (number <= warning ? "warning" : "normal")
    return number >= danger ? "danger" : (number >= warning ? "warning" : "normal")
  }

  function row(fields) {
    return Object.assign({
      icon: "", secondaryText: "", section: "", meter: null, meterLevel: "normal",
      kind: "", target: null, disabled: false
    }, fields)
  }
  // A plain reading, left out when there's nothing to show.
  function reading(rows, key, section, icon, label, value) {
    if (value === "") return
    rows.push(row({ key: key, section: section, icon: icon, primaryText: label, secondaryText: value }))
  }
  function webRow(key, section, icon, label, description, path) {
    return row({ key: key, section: section, icon: icon, primaryText: label, secondaryText: description, kind: "web", target: path })
  }
  function control(key, section, icon, label, description, argv, disabled) {
    return row({ key: key, section: section, icon: icon, primaryText: label, secondaryText: description, kind: "control", target: argv, disabled: disabled === true })
  }

  /** A short reading for each module's row, matching the web overview. */
  function summary(service, module) {
    switch (module) {
    case "system": return service.system ? "Up " + duration(service.system.uptime) : ""
    case "processes": return service.modules.processes ? service.processes.length + " running" : ""
    case "cpu": return percent(service.cpuUsage)
    case "desktop": return focusedWindowText(service)
    case "memory": return percent(service.memoryPercent)
    case "gpus": return service.modules.gpus ? quantity(service.gpus.length, "GPU") : ""
    case "sensors": return service.sensors ? quantity(service.temperatures.length, "temperature") : ""
    case "battery": return service.battery ? percent(service.battery.percentage) : ""
    case "bluetooth": return service.bluetooth ? bluetoothDevices(service).filter(function(device) { return device.connected === true }).length + " connected" : ""
    case "displays": return service.modules.displays ? quantity(service.displays.length, "display") : ""
    case "audio": return audioSummary(service)
    case "disks": return service.disks && Array.isArray(service.disks.devices) ? quantity(service.disks.devices.length, "disk") : ""
    case "networks": return service.networks && Array.isArray(service.networks.networks) ? quantity(service.networks.networks.length, "interface") : ""
    case "media": return service.media && present(service.media.title) ? String(service.media.title) : (service.modules.media !== undefined ? "Nothing playing" : "")
    case "discord": return service.discord ? (service.discord.connected ? "Connected" : "Not connected") : ""
    }
    return ""
  }

  function primaryPartitions(service) {
    var partitions = []
    var devices = service.disks && Array.isArray(service.disks.devices) ? service.disks.devices : []
    for (var i = 0; i < devices.length; i++) {
      var list = devices[i] && Array.isArray(devices[i].partitions) ? devices[i].partitions : []
      for (var j = 0; j < list.length; j++)
        if (list[j] && list[j].category === "primary") partitions.push(list[j])
    }
    return partitions
  }

  function nowPlaying(service, section, kind) {
    var media = service.media
    if (!media || !present(media.title))
      return row({ key: "media-now", section: section, icon: mediaIcon, primaryText: "Nothing playing", kind: kind, target: kind === "module" ? "media" : null })
    return row({
      key: "media-now", section: section, icon: mediaIcon,
      primaryText: String(media.title),
      secondaryText: join([text(media.artist), capitalised(media.status) || "Idle"]),
      kind: kind, target: kind === "module" ? "media" : null
    })
  }

  // Notices first, then every module once under its area: its live readings
  // where it has any, otherwise a row with its summary.
  function overview(service) {
    var rows = []
    var system = service.system
    if (system && system.version_newer_available === true)
      rows.push(row({
        key: "update", section: "", icon: "󰚰",
        primaryText: "System Bridge " + text(system.version_latest) + " is available",
        secondaryText: "This system has " + text(system.version),
        kind: present(system.version_latest_url) ? "url" : "", target: text(system.version_latest_url)
      }))
    if (service.pendingReboot === true)
      rows.push(row({ key: "pending-reboot", icon: "󰜉", primaryText: "Restart required", secondaryText: "Updates are waiting for a restart", kind: "module", target: "system" }))

    for (var m = 0; m < modules.length; m++) {
      var info = modules[m]
      var readings = overviewReadings(service, info.module, info.area)
      if (readings.length === 0)
        readings = [row({ key: "module-" + info.module, section: info.area, icon: info.icon, primaryText: info.label, secondaryText: summary(service, info.module), kind: "module", target: info.module })]
      rows = rows.concat(readings)
    }
    return rows
  }

  /** A module's live readings for the overview, each opening its view. */
  function overviewReadings(service, module, section) {
    var rows = []
    function add(fields) {
      rows.push(row(Object.assign({ section: section, kind: "module", target: module }, fields)))
    }
    switch (module) {
    case "system":
      var system = service.system
      if (system)
        add({ key: "system", icon: systemIcon, primaryText: "System", secondaryText: join([text(system.platform) + (present(system.platform_version) ? " " + system.platform_version : ""), "up " + duration(system.uptime)]) })
      break
    case "cpu":
      var cpu = service.cpu
      if (service.cpuUsage !== null)
        add({ key: "cpu", icon: cpuIcon, primaryText: "CPU", secondaryText: join([percent(service.cpuUsage), frequency(cpu && cpu.frequency ? cpu.frequency.current : null)]), meter: service.cpuUsage, meterLevel: level(service.cpuUsage, 80, 90) })
      break
    case "memory":
      var memory = service.memory && service.memory.virtual ? service.memory.virtual : null
      if (service.memoryPercent !== null)
        add({ key: "memory", icon: memoryIcon, primaryText: "Memory", secondaryText: join([percent(service.memoryPercent), memory && present(memory.used) ? bytes(memory.used) + " of " + bytes(memory.total) : ""]), meter: service.memoryPercent, meterLevel: level(service.memoryPercent, 80, 90) })
      break
    case "gpus":
      for (var g = 0; g < service.gpus.length; g++) {
        var gpu = service.gpus[g]
        if (num(gpu.core_load) !== null)
          add({ key: "gpu-" + (text(gpu.id) || g), icon: gpuIcon, primaryText: text(gpu.name) || "GPU " + (g + 1), secondaryText: join([percent(gpu.core_load), temperature(gpu.temperature)]), meter: num(gpu.core_load), meterLevel: level(gpu.core_load, 80, 90) })
      }
      break
    case "sensors":
      if (service.cpuTemperature !== null)
        add({ key: "cpu-temperature", icon: temperatureIcon, primaryText: "CPU temperature", secondaryText: temperature(service.cpuTemperature), meter: Math.min(100, service.cpuTemperature), meterLevel: level(service.cpuTemperature, 80, 90) })
      break
    case "battery":
      var battery = service.battery
      if (battery && num(battery.percentage) !== null)
        add({ key: "battery", icon: batteryIcon(battery), primaryText: "Battery", secondaryText: join([percent(battery.percentage), battery.is_charging ? "Charging" : (battery.ac_connected === true ? "Plugged in" : "")]), meter: num(battery.percentage), meterLevel: level(battery.percentage, 20, 10, true) })
      break
    case "disks":
      var partitions = primaryPartitions(service)
      for (var i = 0; i < partitions.length; i++) {
        var usage = partitions[i].usage
        add({
          key: "disk-" + partitions[i].mount_point, icon: "󰋊",
          primaryText: text(partitions[i].mount_point),
          secondaryText: usage ? join([percent(usage.percent), bytes(usage.free) + " free"]) : "",
          meter: usage ? num(usage.percent) : null, meterLevel: usage ? level(usage.percent, 80, 92) : "normal"
        })
      }
      break
    case "networks":
      if (service.networkReceiveRate !== null || service.networkSendRate !== null)
        add({ key: "network", icon: networkIcon, primaryText: "Network", secondaryText: join(["↓ " + rate(service.networkReceiveRate), "↑ " + rate(service.networkSendRate)]) })
      break
    case "media":
      if (service.modules.media !== undefined)
        rows.push(nowPlaying(service, section, "module"))
      break
    }
    return rows
  }

  function moduleRows(service, module) {
    switch (module) {
    case "system": return systemRows(service)
    case "processes": return processRows(service)
    case "cpu": return cpuRows(service)
    case "desktop": return desktopRows(service)
    case "memory": return memoryRows(service)
    case "gpus": return gpuRows(service)
    case "sensors": return sensorRows(service)
    case "battery": return batteryRows(service)
    case "bluetooth": return bluetoothRows(service)
    case "displays": return displayRows(service)
    case "audio": return audioRows(service)
    case "disks": return diskRows(service)
    case "networks": return networkRows(service)
    case "media": return mediaRows(service)
    case "discord": return discordRows(service)
    }
    return []
  }

  function systemRows(service) {
    var rows = []
    var system = service.system
    if (system) {
      var device = system.device_info || {}
      reading(rows, "hostname", "", "󰌢", "Hostname", text(system.hostname))
      reading(rows, "platform", "", "\u{F033D}", "Platform", join([text(system.platform) + (present(system.platform_version) ? " " + system.platform_version : ""), text(system.kernel_version)]))
      reading(rows, "device", "", "󰟀", "Device", join([text(device.manufacturer), text(device.model)]))
      reading(rows, "uptime", "", "󰅐", "Uptime", duration(system.uptime))
      reading(rows, "pending-reboot", "", "󰜉", "Restart required", yesNo(system.pending_reboot))
      reading(rows, "package-updates", "", "󰚰", "Package updates", num(system.package_updates) === null ? "" : (num(system.package_updates) === 0 ? "Up to date" : num(system.package_updates) + " waiting"))
      reading(rows, "power", "", "󱐋", "Power", watts(system.power_usage))
      reading(rows, "users", "", "\u{F000E}", "Users", Array.isArray(system.users) ? system.users.map(function(user) { return text(user.name) }).filter(function(name, index, all) { return name !== "" && all.indexOf(name) === index }).join(", ") : "")
      reading(rows, "camera", "", "󰄀", "Camera in use", Array.isArray(system.camera_usage) ? system.camera_usage.join(", ") : "")
      reading(rows, "microphone", "", "\u{F036C}", "Microphone in use", Array.isArray(system.microphone_usage) ? system.microphone_usage.join(", ") : "")
      reading(rows, "ipv4", "Network", "󰩟", "IPv4", text(system.ip_address_4))
      reading(rows, "ipv6", "Network", "󰩟", "IPv6", text(system.ip_address_6))
      reading(rows, "mac", "Network", "󰛳", "MAC address", text(system.mac_address))
      reading(rows, "version", "System Bridge", "󰒋", "Version", join([text(system.version), system.version_newer_available === true ? text(system.version_latest) + " available" : (system.version_newer_available === false ? "Up to date" : "")]))
      if (system.version_newer_available === true && present(system.version_latest_url))
        rows.push(row({ key: "update", section: "System Bridge", icon: "󰚰", primaryText: "See what's new", secondaryText: "Release notes for " + text(system.version_latest), kind: "url", target: String(system.version_latest_url) }))
    }
    rows.push(webRow("web-commands", "In the web client", "\u{F018D}", "Commands", "Run and set up commands", "/system#commands"))
    rows.push(webRow("web-notifications", "In the web client", "󰂚", "Notifications", "Send a notification", "/system#notifications"))
    rows.push(webRow("web-open", "In the web client", "󰏌", "Open", "Open a URL or path", "/system#open"))
    return rows
  }

  function processRows(service) {
    var rows = []
    var list = service.processes.slice().sort(function(a, b) { return (num(b.cpu_usage) || 0) - (num(a.cpu_usage) || 0) })
    if (service.modules.processes)
      reading(rows, "count", "", processIcon, "Running", quantity(service.processes.length, "process", "processes"))
    for (var i = 0; i < Math.min(10, list.length); i++) {
      var process = list[i]
      rows.push(row({
        key: "process-" + process.id, section: "Busiest", icon: "\u{F08C6}",
        primaryText: text(process.name) || "Process " + process.id,
        secondaryText: join(["CPU " + percent(process.cpu_usage), "memory " + percent((num(process.memory_usage) || 0) * 100), text(process.username)])
      }))
    }
    rows.push(webRow("web-processes", "In the web client", "󰓫", "All processes", "Sort and filter every process", "/processes"))
    return rows
  }

  function cpuRows(service) {
    var rows = []
    var cpu = service.cpu
    if (!cpu) return rows
    if (service.cpuUsage !== null)
      rows.push(row({ key: "usage", icon: cpuIcon, primaryText: "Usage", secondaryText: percent(service.cpuUsage), meter: service.cpuUsage, meterLevel: level(service.cpuUsage, 80, 90) }))
    reading(rows, "name", "", cpuIcon, "Processor", join([text(cpu.name), present(cpu.count) ? quantity(num(cpu.count), "thread") : ""]))
    var range = cpu.frequency && present(cpu.frequency.min) && present(cpu.frequency.max) && num(cpu.frequency.max) > 0
      ? frequency(cpu.frequency.min) + " to " + frequency(cpu.frequency.max) : ""
    reading(rows, "frequency", "", "󰓅", "Frequency", join([frequency(cpu.frequency ? cpu.frequency.current : null), range]))
    reading(rows, "load", "", "󰓅", "Load average", join([cpu.load_average, cpu.load_average_5, cpu.load_average_15].map(function(load) { return num(load) === null ? "" : num(load).toFixed(2) })))
    reading(rows, "temperature", "", temperatureIcon, "Temperature", temperature(cpu.temperature))
    reading(rows, "power", "", "󱐋", "Power", watts(cpu.power))
    reading(rows, "voltage", "", "󱐋", "Voltage", num(cpu.voltage) === null ? "" : num(cpu.voltage).toFixed(2) + " V")
    var cores = Array.isArray(cpu.per_cpu) ? cpu.per_cpu : []
    for (var i = 0; i < cores.length; i++) {
      var core = cores[i]
      rows.push(row({
        key: "core-" + core.id, section: "Cores", icon: cpuIcon,
        primaryText: "Core " + core.id,
        secondaryText: join([percent(core.usage), frequency(core.frequency ? core.frequency.current : null)]),
        meter: num(core.usage), meterLevel: level(core.usage, 80, 90)
      }))
    }
    return rows
  }

  function desktopWindows(service) {
    return service.desktop && Array.isArray(service.desktop.windows) ? service.desktop.windows : []
  }
  function desktopWorkspaces(service) {
    return service.desktop && Array.isArray(service.desktop.workspaces) ? service.desktop.workspaces : []
  }
  function windowName(window) { return text(window.app) || text(window.title) || "Window" }
  function focusedWindowText(service) {
    var windows = desktopWindows(service)
    for (var i = 0; i < windows.length; i++)
      if (windows[i].focused === true) return windowName(windows[i])
    return service.desktop ? "Nothing focused" : ""
  }

  // Selecting a window or workspace focuses it.
  function desktopRows(service) {
    var rows = []
    var desktop = service.desktop
    if (!desktop) return rows
    var argv = function(action, value) { return ["system-bridge", "client", "desktop", action, value] }
    var workspaces = desktopWorkspaces(service)
    var names = {}
    for (var w = 0; w < workspaces.length; w++)
      names[workspaces[w].id] = text(workspaces[w].name) || text(workspaces[w].id)
    var windows = desktopWindows(service)
    for (var i = 0; i < windows.length; i++) {
      var window = windows[i]
      var details = join([text(window.title), window.workspace === null ? "" : names[window.workspace] || text(window.workspace), window.focused === true ? "Focused" : ""])
      rows.push(control("window-" + window.id, "Windows", "\u{F08C6}", windowName(window), details, argv("focus", text(window.id)), window.focused === true))
    }
    // Windows can't switch workspaces for you
    if (desktop.compositor !== "windows")
      for (var j = 0; j < workspaces.length; j++) {
        var workspace = workspaces[j]
        rows.push(control("workspace-" + workspace.id, "Workspaces", "\u{F11D9}", names[workspace.id], join([text(workspace.display), num(workspace.windows) === null ? "" : quantity(num(workspace.windows), "window"), workspace.focused === true ? "Focused" : ""]), argv("workspace", text(workspace.id)), workspace.focused === true))
      }
    var keyboard = desktop.keyboard || {}
    var layouts = Array.isArray(keyboard.layouts) ? keyboard.layouts : []
    reading(rows, "keyboard", "Keyboard", "\u{F030C}", "Layout", join([text(keyboard.layout), text(keyboard.name)]))
    // Other Wayland desktops can't switch layouts for you
    if (desktop.compositor !== "wayland")
      for (var k = 0; k < layouts.length; k++)
        if (layouts[k] !== keyboard.layout)
          rows.push(control("layout-" + layouts[k], "Keyboard", "\u{F030C}", "Switch to " + layouts[k], "", argv("layout", text(layouts[k]))))
    if (desktop.hyprland)
      rows.push(control("hyprland-reload", "Hyprland", "\u{F0453}", "Reload config", text(desktop.hyprland.version ? desktop.hyprland.version.version : ""), ["system-bridge", "client", "hyprland", "reload"]))
    rows.push(webRow("web-desktop", "In the web client", desktopIcon, "All controls", "Close, move, float and pin windows, and global shortcuts", "/desktop"))
    return rows
  }

  function memoryRows(service) {
    var rows = []
    var memory = service.memory
    if (!memory) return rows
    var virtual = memory.virtual
    if (virtual)
      rows.push(row({ key: "memory", icon: memoryIcon, primaryText: "Memory", secondaryText: join([percent(virtual.percent), bytes(virtual.used) + " of " + bytes(virtual.total)]), meter: num(virtual.percent), meterLevel: level(virtual.percent, 80, 90) }))
    if (virtual) reading(rows, "available", "", memoryIcon, "Available", bytes(virtual.available))
    if (virtual) reading(rows, "cached", "", memoryIcon, "Cached", bytes(virtual.cached))
    var swap = memory.swap
    if (swap && num(swap.total) > 0)
      rows.push(row({ key: "swap", icon: "󰾴", primaryText: "Swap", secondaryText: join([percent(swap.percent), bytes(swap.used) + " of " + bytes(swap.total)]), meter: num(swap.percent), meterLevel: level(swap.percent, 80, 90) }))
    return rows
  }

  function gpuRows(service) {
    var rows = []
    for (var i = 0; i < service.gpus.length; i++) {
      var gpu = service.gpus[i]
      var section = text(gpu.name) || "GPU " + (i + 1)
      var key = "gpu-" + (text(gpu.id) || i)
      if (num(gpu.core_load) !== null)
        rows.push(row({ key: key + "-load", section: section, icon: "󰓅", primaryText: "Load", secondaryText: percent(gpu.core_load), meter: num(gpu.core_load), meterLevel: level(gpu.core_load, 80, 90) }))
      if (num(gpu.memory_total) > 0)
        rows.push(row({ key: key + "-memory", section: section, icon: memoryIcon, primaryText: "Memory", secondaryText: mebibytes(gpu.memory_used) + " of " + mebibytes(gpu.memory_total), meter: num(gpu.memory_used) / num(gpu.memory_total) * 100, meterLevel: level(num(gpu.memory_used) / num(gpu.memory_total) * 100, 80, 90) }))
      reading(rows, key + "-clocks", section, "󰓅", "Clocks", join([gpu.core_clock ? "core " + frequency(gpu.core_clock) : "", gpu.memory_clock ? "memory " + frequency(gpu.memory_clock) : ""]))
      reading(rows, key + "-power", section, "󱐋", "Power", join([watts(gpu.power_usage), num(gpu.power_limit) !== null ? "limit " + watts(gpu.power_limit) : ""]))
      reading(rows, key + "-temperature", section, temperatureIcon, "Temperature", temperature(gpu.temperature))
      reading(rows, key + "-fan", section, "󰈐", "Fan", join([num(gpu.fan_speed) === null ? "" : Math.round(num(gpu.fan_speed)) + " RPM", percent(gpu.fan_speed_percent)]))
      reading(rows, key + "-video", section, "󰕧", "Video", join([num(gpu.encoder_load) !== null ? "encode " + percent(gpu.encoder_load) : "", num(gpu.decoder_load) !== null ? "decode " + percent(gpu.decoder_load) : ""]))
      reading(rows, key + "-state", section, "󰓅", "Performance state", text(gpu.performance_state))
    }
    return rows
  }

  function sensorRows(service) {
    var rows = []
    var temperatures = service.temperatures.slice().sort(function(a, b) { return (num(b.temperature) || 0) - (num(a.temperature) || 0) })
    for (var i = 0; i < temperatures.length; i++) {
      var sensor = temperatures[i]
      var limit = num(sensor.critical) > 0 ? num(sensor.critical) : (num(sensor.high) > 0 ? num(sensor.high) : 100)
      var state = service.reaches(sensor.temperature, sensor.critical) ? "danger" : (service.reaches(sensor.temperature, sensor.high) ? "warning" : "normal")
      rows.push(row({
        key: "temperature-" + sensor.key + "-" + i, section: "Temperatures", icon: temperatureIcon,
        primaryText: text(sensor.key) || "Sensor",
        secondaryText: join([temperature(sensor.temperature), num(sensor.high) > 0 ? "high " + temperature(sensor.high) : "", num(sensor.critical) > 0 ? "critical " + temperature(sensor.critical) : ""]),
        meter: Math.min(100, (num(sensor.temperature) || 0) / limit * 100), meterLevel: state
      }))
    }
    for (var j = 0; j < service.fans.length; j++) {
      var fan = service.fans[j]
      if (num(fan.speed_rpm) === null) continue
      rows.push(row({ key: "fan-" + fan.key + "-" + j, section: "Fans", icon: "󰈐", primaryText: text(fan.label) || text(fan.name) || "Fan", secondaryText: Math.round(num(fan.speed_rpm)) + " RPM" }))
    }
    return rows
  }

  function batteryRows(service) {
    var rows = []
    var battery = service.battery
    if (!battery) return rows
    var batteries = Array.isArray(battery.batteries) ? battery.batteries : []
    // Systems without a battery still report charging as false.
    if (num(battery.percentage) !== null) {
      rows.push(row({ key: "charge", icon: batteryIcon(battery), primaryText: "Charge", secondaryText: percent(battery.percentage), meter: num(battery.percentage), meterLevel: level(battery.percentage, 20, 10, true) }))
      reading(rows, "state", "", "󰚥", "State", batteryStateText(battery.state) || (battery.is_charging === true ? "Charging" : ""))
      reading(rows, "source", "", "󰚥", "Power source", battery.ac_connected === true ? "Plugged in" : (battery.ac_connected === false ? "Battery" : ""))
      reading(rows, "remaining", "", "󰅐", battery.state === "charging" ? "Time to full" : "Time remaining", num(battery.time_remaining) > 0 ? duration(battery.time_remaining) : "")
      reading(rows, "power", "", "󱐋", "Power", watts(battery.power))
      reading(rows, "voltage", "", "󱐋", "Voltage", num(battery.voltage) === null ? "" : num(battery.voltage).toFixed(1) + " V")
    }
    var primaryFound = false
    for (var i = 0; i < batteries.length; i++) {
      var item = batteries[i]
      // The first system battery is the one shown above
      if (item.scope === "system" && !primaryFound && num(battery.percentage) !== null) {
        primaryFound = true
        continue
      }
      rows.push(row({
        key: "battery-" + (text(item.name) || i), section: "Batteries",
        icon: item.state === "charging" ? "󰂄" : "󰁹",
        primaryText: text(item.model) || text(item.name) || "Battery " + (i + 1),
        secondaryText: join([percent(item.percentage), batteryStateText(item.state)]),
        meter: num(item.percentage), meterLevel: level(item.percentage, 20, 10, true)
      }))
    }
    return rows
  }

  function batteryIcon(battery) {
    if (battery.is_charging === true) return "󰂄"
    if (battery.ac_connected === true) return "󰚥"
    return "󰁹"
  }

  function batteryStateText(state) {
    switch (state) {
    case "charging": return "Charging"
    case "discharging": return "Discharging"
    case "full": return "Full"
    case "not_charging": return "Not charging"
    case "empty": return "Empty"
    default: return ""
    }
  }

  // Icons for the freedesktop icon names devices report as their type,
  // matching the web client's.
  readonly property var bluetoothIcons: ({
    "audio-card": "\u{F04C3}",
    "audio-headphones": "\u{F02CB}",
    "audio-headset": "\u{F02CE}",
    "camera-photo": "\u{F0100}",
    "camera-video": "\u{F0567}",
    "computer": "\u{F0322}",
    "input-gaming": "\u{F0297}",
    "input-keyboard": "\u{F030C}",
    "input-mouse": "\u{F037D}",
    "input-tablet": "\u{F04F6}",
    "network-wireless": "\u{F05A9}",
    "phone": "\u{F011C}",
    "printer": "\u{F042A}"
  })

  function bluetoothDevices(service) {
    return service.bluetooth && Array.isArray(service.bluetooth.devices) ? service.bluetooth.devices : []
  }

  function bluetoothRows(service) {
    var devices = bluetoothDevices(service)
    var rows = []
    for (var i = 0; i < devices.length; i++) {
      var device = devices[i]
      rows.push(row({
        key: "bluetooth-" + (text(device.address) || i), section: "Paired devices",
        icon: bluetoothIcons[text(device.type)] || bluetoothIcon,
        primaryText: text(device.name) || text(device.address),
        secondaryText: device.connected === true ? "Connected" : "Not connected"
      }))
    }
    return rows
  }

  function audioDevices(service, key) {
    var devices = service.audio && Array.isArray(service.audio[key]) ? service.audio[key].slice() : []
    devices.sort(function(left, right) { return text(left.name).localeCompare(text(right.name)) })
    return devices
  }

  function audioSummary(service) {
    var output = audioDevices(service, "outputs").filter(function(device) { return device.default === true })[0]
    if (!output) return ""
    if (output.muted === true) return "Muted"
    return percent(output.volume) || text(output.name)
  }

  function audioRows(service) {
    var rows = []
    var groups = [
      { key: "outputs", section: "Outputs", icon: "󰕾", mutedIcon: "󰖁" },
      { key: "inputs", section: "Inputs", icon: "\u{F036C}", mutedIcon: "\u{F036D}" }
    ]
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g]
      var devices = audioDevices(service, group.key)
      for (var i = 0; i < devices.length; i++) {
        var device = devices[i]
        var muted = device.muted === true
        rows.push(row({
          key: "audio-" + group.key + "-" + (text(device.id) || i), section: group.section,
          icon: muted ? group.mutedIcon : group.icon,
          primaryText: text(device.name) || text(device.id),
          secondaryText: join([device.default === true ? "Default" : "", muted ? "Muted" : "", percent(device.volume)]),
          meter: muted ? null : num(device.volume)
        }))
        audioControls(rows, device, group)
      }
    }
    return rows
  }

  // Volume and mute for the default devices, and a way to switch to the others
  function audioControls(rows, device, group) {
    var id = text(device.id)
    if (!id) return
    var key = "audio-" + group.key + "-" + id
    var argv = function(args) { return ["system-bridge", "client", "audio"].concat(args, [id]) }
    if (device.default !== true) {
      rows.push(control(key + "-default", group.section, "󰄬", "Make default", text(device.name), argv(["--default"])))
      return
    }
    var volume = num(device.volume)
    if (volume !== null) {
      var current = Math.round(volume)
      rows.push(control(key + "-down", group.section, "󰝞", "Quieter", "To " + Math.max(0, current - 10) + "%", argv(["--volume", String(Math.max(0, current - 10))]), current <= 0))
      rows.push(control(key + "-up", group.section, "󰝝", "Louder", "To " + Math.min(100, current + 10) + "%", argv(["--volume", String(Math.min(100, current + 10))]), current >= 100))
    }
    if (device.muted === true || device.muted === false) {
      var muted = device.muted === true
      rows.push(control(key + "-mute", group.section, muted ? group.icon : group.mutedIcon, muted ? "Unmute" : "Mute", text(device.name), argv([muted ? "--mute=false" : "--mute"])))
    }
  }

  function displayRows(service) {
    var rows = []
    for (var i = 0; i < service.displays.length; i++) {
      var display = service.displays[i]
      var name = (text(display.name) || "Display " + (i + 1)) + (display.is_primary === true ? " (primary)" : "")
      var controllable = num(display.brightness) !== null || present(display.power_state)
      rows.push(row({
        key: "display-" + (text(display.id) || i), section: controllable ? name : "", icon: "󰍹",
        primaryText: controllable ? text(display.id) || name : name,
        secondaryText: join([
          present(display.resolution_horizontal) ? display.resolution_horizontal + " × " + display.resolution_vertical : "",
          num(display.refresh_rate) ? Math.round(num(display.refresh_rate)) + " Hz" : "",
          present(display.x) ? "at " + display.x + ", " + display.y : ""
        ])
      }))
      if (controllable) displayControls(rows, display, name)
    }
    return rows
  }

  function displayControls(rows, display, section) {
    var id = text(display.id)
    var argv = function(flag, value) { return ["system-bridge", "client", "display", flag, value, id] }
    var brightness = num(display.brightness)
    if (brightness !== null) {
      var current = Math.round(brightness)
      rows.push(row({ key: "brightness-" + id, section: section, icon: "󰃟", primaryText: "Brightness", secondaryText: percent(brightness), meter: brightness }))
      rows.push(control("brightness-down-" + id, section, "󰃞", "Dimmer", "To " + Math.max(0, current - 10) + "%", argv("--brightness", String(Math.max(0, current - 10))), current <= 0))
      rows.push(control("brightness-up-" + id, section, "󰃠", "Brighter", "To " + Math.min(100, current + 10) + "%", argv("--brightness", String(Math.min(100, current + 10))), current >= 100))
    }
    if (present(display.power_state)) {
      var on = display.power_state === "on"
      rows.push(control("power-" + id, section, on ? "󰶐" : "󰍹", on ? "Turn off" : "Turn on", on ? "On" : "Off", argv("--power", on ? "off" : "on")))
    }
  }

  function diskRows(service) {
    var rows = []
    var io = service.disks ? service.disks.io_counters : null
    if (io) {
      reading(rows, "disk-read", "Activity", "󰁅", "Read", join([rate(io.read_bytes_rate), bytes(io.read_bytes) + " total"]))
      reading(rows, "disk-write", "Activity", "󰁝", "Written", join([rate(io.write_bytes_rate), bytes(io.write_bytes) + " total"]))
    }
    var devices = service.disks && Array.isArray(service.disks.devices) ? service.disks.devices : []
    for (var i = 0; i < devices.length; i++) {
      var device = devices[i]
      var section = join([text(device.name), temperature(device.temperature)]) || "Disk " + (i + 1)
      var deviceIO = device.io_counters
      if (deviceIO)
        reading(rows, "disk-io-" + device.name, section, "󰓅", "Activity", join([
          num(deviceIO.read_bytes_rate) !== null ? "Read " + rate(deviceIO.read_bytes_rate) : "",
          num(deviceIO.write_bytes_rate) !== null ? "Write " + rate(deviceIO.write_bytes_rate) : ""
        ]))
      var partitions = Array.isArray(device.partitions) ? device.partitions : []
      for (var j = 0; j < partitions.length; j++) {
        var partition = partitions[j]
        var usage = partition.usage
        rows.push(row({
          key: "partition-" + partition.device + "-" + partition.mount_point, section: section, icon: "󰋊",
          primaryText: text(partition.mount_point) || text(partition.device),
          secondaryText: join([text(partition.filesystem_type), usage ? bytes(usage.free) + " free of " + bytes(usage.total) : ""]),
          meter: usage ? num(usage.percent) : null, meterLevel: usage ? level(usage.percent, 80, 92) : "normal"
        }))
      }
    }
    rows.push(webRow("web-disk-mounts", "In the web client", settingsIcon, "Choose disks", "Pick which mounts System Bridge reports", "/disks#disk-mounts"))
    return rows
  }

  function networkRows(service) {
    var rows = []
    var networks = service.networks
    if (!networks) return rows
    reading(rows, "receive", "Traffic", "󰁅", "Received", join([rate(service.networkReceiveRate), networks.io ? bytes(networks.io.bytes_recv) + " total" : ""]))
    reading(rows, "send", "Traffic", "󰁝", "Sent", join([rate(service.networkSendRate), networks.io ? bytes(networks.io.bytes_sent) + " total" : ""]))
    var interfaces = Array.isArray(networks.networks) ? networks.networks : []
    for (var i = 0; i < interfaces.length; i++) {
      var network = interfaces[i]
      var addresses = Array.isArray(network.addresses) ? network.addresses.map(function(address) { return text(address.address) }) : []
      var stats = network.stats || {}
      var io = network.io || {}
      var wifi = network.wifi || {}
      rows.push(row({
        key: "interface-" + (text(network.name) || i), section: "Interfaces",
        icon: stats.isup === false ? "󰲛" : text(wifi.ssid) ? "󰖩" : networkIcon,
        primaryText: text(network.name) || "Interface " + (i + 1),
        secondaryText: join([stats.isup === false ? "Down" : "", text(wifi.ssid), percent(wifi.signal_percent), num(io.bytes_recv_rate) !== null ? "↓ " + rate(io.bytes_recv_rate) : "", num(io.bytes_sent_rate) !== null ? "↑ " + rate(io.bytes_sent_rate) : "", num(stats.speed) > 0 ? stats.speed + " Mb/s" : "", num(wifi.link_rate) > 0 ? Math.round(num(wifi.link_rate)) + " Mb/s" : "", addresses.filter(function(address) { return address !== "" }).join(", ")])
      }))
    }
    return rows
  }

  function mediaRows(service) {
    var rows = []
    var media = service.media
    rows.push(nowPlaying(service, "", ""))
    if (media && present(media.title)) {
      reading(rows, "album", "", "󰀥", "Album", join([text(media.album_title), text(media.album_artist)]))
      reading(rows, "position", "", "󰅐", "Position", num(media.duration) > 0 ? clock(media.position) + " of " + clock(media.duration) : "")
      reading(rows, "volume", "", "󰕾", "Volume", num(media.volume) === null ? "" : percent(num(media.volume) * 100))
      var playing = String(media.status || "").toUpperCase() === "PLAYING"
      var argv = function(action) { return ["system-bridge", "client", "media", action] }
      rows.push(control("previous", "Controls", "󰒮", "Previous", "", argv("previous"), media.is_previous_enabled === false))
      rows.push(playing
        ? control("play-pause", "Controls", "󰏤", "Pause", "", argv("pause"), media.is_pause_enabled === false)
        : control("play-pause", "Controls", "󰐊", "Play", "", argv("play"), media.is_play_enabled === false))
      rows.push(control("next", "Controls", "󰒭", "Next", "", argv("next"), media.is_next_enabled === false))
    }
    rows.push(webRow("web-media", "In the web client", mediaIcon, "All controls", "Stop, volume and the media browser", "/media#media-controls"))
    rows.push(webRow("web-media-directories", "In the web client", "󰉋", "Media directories", "Choose the folders System Bridge shares", "/media#media-directories"))
    return rows
  }

  function discordRows(service) {
    var rows = []
    var discord = service.discord
    if (discord) {
      var user = discord.user
      reading(rows, "status", "", discordIcon, "Discord", join([discord.connected ? "Connected" : "Not connected", user ? text(user.global_name) || text(user.username) : ""]))
      reading(rows, "error", "", "󰀦", "Problem", text(discord.error))
      var call = discord.call
      if (call)
        reading(rows, "call", "", "󰕾", "In a call", join([call.channel ? text(call.channel.name) : "", call.server ? text(call.server.name) : "", Array.isArray(call.members) ? quantity(call.members.length, "member") : ""]))
      if (discord.connected) {
        var argv = function(action) { return ["system-bridge", "client", "discord", action] }
        rows.push(control("mute", "Controls", discord.mute === true ? "󰍭" : "󰍬", discord.mute === true ? "Unmute" : "Mute", discord.mute === true ? "Muted" : "Not muted", argv("toggle_mute")))
        rows.push(control("deafen", "Controls", discord.deaf === true ? "󰟎" : "󰋋", discord.deaf === true ? "Undeafen" : "Deafen", discord.deaf === true ? "Deafened" : "Not deafened", argv("toggle_deafen")))
        if (call)
          rows.push(control("leave", "Controls", "󰩈", "Leave call", call.channel ? text(call.channel.name) : "", argv("leave_voice_channel")))
      }
    }
    rows.push(webRow("web-discord", "In the web client", discordIcon, "All controls", "Volumes, devices, members and sounds", "/discord#discord-controls"))
    rows.push(webRow("web-discord-setup", "In the web client", settingsIcon, "Discord setup", "Connect System Bridge to Discord", "/discord#discord-setup"))
    return rows
  }
}
