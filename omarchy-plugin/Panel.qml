import QtQuick
import QtQuick.Controls
import qs.Commons
import qs.Ui

Panel {
  id: root
  moduleName: "timmo.system-bridge"

  property var anchorItem: null
  property var hostWidget: null
  property var service: null
  readonly property var barIdentity: hostWidget || root
  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property var panelRows: buildPanelRows()

  function formatPercent(value) { return value === null ? "" : Math.round(value) + "%" }
  function formatTemperature(value) { return value === null ? "" : Math.round(value) + " °C" }
  function formatBytes(value) {
    if (value === null) return ""
    return (value / 1073741824).toFixed(1) + " GiB"
  }
  function formatMebibytes(value) {
    if (value === null) return ""
    return value >= 1024 ? (value / 1024).toFixed(1) + " GiB" : Math.round(value) + " MiB"
  }
  function formatDuration(seconds) {
    if (seconds === null) return ""
    var totalMinutes = Math.floor(seconds / 60)
    var days = Math.floor(totalMinutes / 1440)
    var hours = Math.floor((totalMinutes % 1440) / 60)
    var minutes = totalMinutes % 60
    var values = []
    if (days > 0) values.push(days + "d")
    if (hours > 0) values.push(hours + "h")
    if (minutes > 0 || values.length === 0) values.push(minutes + "m")
    return values.join(" ")
  }
  function buildPanelRows() {
    if (!service) return []
    var values = []
    if (service.cpuUsage !== null)
      values.push({ key: "cpu", icon: "", primaryText: "CPU", secondaryText: formatPercent(service.cpuUsage) })
    if (service.memoryPercent !== null || service.memoryUsed !== null || service.memoryTotal !== null) {
      var memory = []
      if (service.memoryPercent !== null) memory.push(formatPercent(service.memoryPercent))
      if (service.memoryUsed !== null && service.memoryTotal !== null)
        memory.push(formatBytes(service.memoryUsed) + " / " + formatBytes(service.memoryTotal))
      values.push({ key: "memory", icon: "", primaryText: "Memory", secondaryText: memory.join(" · ") })
    }
    if (service.cpuLoad !== null)
      values.push({ key: "load", icon: "󰓅", primaryText: "Load", secondaryText: service.cpuLoad.toFixed(2) })
    if (service.cpuTemperature !== null)
      values.push({ key: "cpu-temperature", icon: "", primaryText: "CPU temperature", secondaryText: formatTemperature(service.cpuTemperature) })
    if (service.hottestTemperature !== null)
      values.push({ key: "hottest-sensor", icon: "󰔏", primaryText: "Hottest sensor", secondaryText: (service.hottestSensor ? service.hottestSensor + " · " : "") + formatTemperature(service.hottestTemperature) })
    if (service.rootDisk !== null) {
      var disk = service.rootDisk
      var diskUsage = disk.usage
      var diskValues = []
      if (diskUsage.percent !== undefined && diskUsage.percent !== null)
        diskValues.push(formatPercent(Number(diskUsage.percent)))
      if (diskUsage.used !== undefined && diskUsage.total !== undefined)
        diskValues.push(formatBytes(Number(diskUsage.used)) + " / " + formatBytes(Number(diskUsage.total)))
      values.push({ key: "disk-root", icon: "󰋊", primaryText: "/", secondaryText: diskValues.join(" · ") })
    }
    for (var fanIndex = 0; fanIndex < service.fans.length; fanIndex++) {
      var fan = service.fans[fanIndex]
      if (fan.speed_rpm === undefined || fan.speed_rpm === null) continue
      values.push({ key: "fan-" + fan.key, icon: "󰈐", primaryText: fan.label || fan.name || "Fan", secondaryText: Math.round(Number(fan.speed_rpm)) + " RPM" })
    }
    for (var gpuIndex = 0; gpuIndex < service.gpus.length; gpuIndex++) {
      var gpu = service.gpus[gpuIndex]
      var gpuValues = []
      if (gpu.core_load !== undefined && gpu.core_load !== null)
        gpuValues.push("Load " + formatPercent(Number(gpu.core_load)))
      if (gpu.memory_used !== undefined && gpu.memory_used !== null && gpu.memory_total !== undefined && gpu.memory_total !== null)
        gpuValues.push("Memory " + formatMebibytes(Number(gpu.memory_used)) + " / " + formatMebibytes(Number(gpu.memory_total)))
      if (gpu.power_usage !== undefined && gpu.power_usage !== null)
        gpuValues.push("Power " + Number(gpu.power_usage).toFixed(1) + " W")
      if (gpu.temperature !== undefined && gpu.temperature !== null)
        gpuValues.push("Temperature " + formatTemperature(Number(gpu.temperature)))
      if (gpuValues.length > 0)
        values.push({ key: "gpu-" + (gpu.id || gpuIndex), icon: "󰢮", primaryText: gpu.name || "GPU", secondaryText: gpuValues.join(" · ") })
    }
    if (service.uptime !== null)
      values.push({ key: "uptime", icon: "󰅐", primaryText: "Uptime", secondaryText: formatDuration(service.uptime) })
    if (service.pendingReboot !== null)
      values.push({ key: "pending-reboot", icon: "󰜉", primaryText: "Pending reboot", secondaryText: service.pendingReboot ? "Required" : "No" })
    return values
  }

  function open() {
    filterController.reset()
    controller.show()
    Qt.callLater(function() {
      panelFlick.contentY = 0
      filterController.forceActiveFocus()
    })
  }
  function close() { controller.hide() }
  function toggle() { if (opened) close(); else open() }
  function switchPanel(direction) {
    if (bar && typeof bar.switchPanelFrom === "function")
      return bar.switchPanelFrom(barIdentity, direction)
    return false
  }

  function cursorItem() {
    var entry = filterController.selectedEntry()
    if (!entry) return null
    return rowRepeater.itemAt(filterController.filteredModel.indexOf(entry))
  }

  function scrollCursorIntoView() {
    var item = cursorItem()
    if (!item) return
    var point = item.mapToItem(contentColumn, 0, 0)
    if (point.y < panelFlick.contentY) panelFlick.contentY = point.y
    else if (point.y + item.height > panelFlick.contentY + panelFlick.height)
      panelFlick.contentY = point.y + item.height - panelFlick.height
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: filterController
    contentWidth: panel.fittedContentWidth(Style.space(430))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight, Style.space(670))

    FilterablePanel {
      id: filterController
      anchors.fill: parent
      model: root.panelRows
      onRevealRequested: Qt.callLater(root.scrollCursorIntoView)
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Flickable {
        id: panelFlick
        anchors.fill: parent
        contentWidth: width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        flickableDirection: Flickable.VerticalFlick
        interactive: contentHeight > height
        ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

        Column {
          id: contentColumn
          width: panelFlick.width
          spacing: Style.space(12)

          PanelHero {
            width: parent.width
            title: root.service && root.service.hostname !== "" ? root.service.hostname : "System Bridge"
            meta: root.service && root.service.connected
              ? (root.service.stale ? "Data is stale" : "")
              : "Waiting for System Bridge"
            detail: root.service && root.service.connected ? "ONLINE" : "OFFLINE"
            foreground: root.contentForeground
            fontFamily: root.contentFontFamily
            iconOpacity: root.service && root.service.connected ? 1 : 0.5
            iconComponent: Component {
              Text {
                text: "󰒋"
                color: root.hostWidget ? root.hostWidget.displayColor : root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.display
              }
            }
          }

          Text {
            visible: filterController.count > 0
            text: filterController.filterText || "SYSTEM"
            color: Qt.darker(root.contentForeground, 1.4)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.2
          }

          Column {
            width: parent.width
            spacing: Style.space(2)

            Repeater {
              id: rowRepeater
              model: filterController.filteredModel

              CursorSurface {
                required property int index
                required property var modelData
                width: contentColumn.width
                implicitHeight: rowColumn.implicitHeight + Style.space(12)
                hasCursor: filterController.cursorIndex === filterController.indexForKey(modelData.key)
                foreground: root.contentForeground
                accent: root.contentForeground

                Row {
                  anchors.left: parent.left
                  anchors.right: parent.right
                  anchors.verticalCenter: parent.verticalCenter
                  anchors.leftMargin: Style.space(8)
                  anchors.rightMargin: Style.space(8)
                  spacing: Style.space(10)

                  Text {
                    width: Style.space(22)
                    text: modelData.icon
                    color: root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.icon
                    horizontalAlignment: Text.AlignHCenter
                  }

                  Column {
                    id: rowColumn
                    width: Math.max(0, parent.width - Style.space(32))
                    spacing: Style.space(2)

                    Text {
                      width: parent.width
                      text: modelData.primaryText
                      color: root.contentForeground
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.body
                      font.bold: true
                      elide: Text.ElideRight
                    }

                    Text {
                      width: parent.width
                      text: modelData.secondaryText
                      color: Qt.darker(root.contentForeground, 1.4)
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.caption
                      elide: Text.ElideRight
                    }
                  }
                }

                MouseArea {
                  anchors.fill: parent
                  hoverEnabled: true
                  onEntered: filterController.cursorIndex = filterController.indexForKey(modelData.key)
                }
              }
            }
          }

          Text {
            visible: filterController.count === 0
            width: parent.width
            text: filterController.filterText
              ? "No matches for “" + filterController.filterText + "”"
              : (root.service && root.service.connected ? "No system data available" : "System Bridge is offline")
            color: Qt.darker(root.contentForeground, 1.4)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.body
            horizontalAlignment: Text.AlignHCenter
          }
        }
      }
    }
  }
}
