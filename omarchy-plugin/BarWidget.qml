import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui

BarWidget {
  id: root
  moduleName: "timmo.system-bridge"

  readonly property bool primaryOnly: setting("primaryOnly", false)
  readonly property string preferredOutput: setting("primaryOutput", "")
  readonly property string currentOutput: {
    var window = root.QsWindow ? root.QsWindow.window : null
    return window && window.screen ? String(window.screen.name || "") : ""
  }
  readonly property string activeOutput: {
    var screens = Quickshell.screens
    for (var i = 0; i < screens.length; i++)
      if (root.preferredOutput !== "" && screens[i].name === root.preferredOutput)
        return root.preferredOutput
    return screens.length > 0 ? String(screens[0].name || "") : ""
  }
  readonly property bool activeInstance: !primaryOnly
    || (currentOutput !== "" && currentOutput === activeOutput)
  readonly property var systemBridge: bar?.shell?.serviceFor("timmo.system-bridge")
  property bool openWhenPanelLoads: false
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item
    ? panelLoader.item.popoutSwitchClosing === true : false
  readonly property real openPanelIndicatorWidth: content.implicitWidth
  readonly property bool warning: systemBridge && (
    systemBridge.cpuUsage !== null && systemBridge.cpuUsage >= 90
    || systemBridge.memoryPercent !== null && systemBridge.memoryPercent >= 90
    || systemBridge.highTemperature || systemBridge.stale
    || systemBridge.pendingReboot === true
    || systemBridge.newerVersionAvailable === true)
  readonly property string displayText: {
    if (!systemBridge || !systemBridge.connected) return " --%   --%"
    var cpu = systemBridge.cpuUsage === null ? "--" : Math.round(systemBridge.cpuUsage)
    var memory = systemBridge.memoryPercent === null ? "--" : Math.round(systemBridge.memoryPercent)
    return " " + cpu + "%   " + memory + "%"
  }
  readonly property color displayColor: {
    if (!systemBridge || !systemBridge.connected) return "#9b9b9b"
    if (systemBridge.criticalTemperature) return bar ? bar.urgent : Color.urgent
    if (warning) return "#e5c07b"
    return bar ? bar.barForeground : Color.foreground
  }
  readonly property string tooltipText: buildTooltip()

  function buildTooltip() {
    var status = !systemBridge ? "Unavailable"
      : (!systemBridge.connected ? "Offline" : (systemBridge.stale ? "Stale" : "Online"))
    var cpu = systemBridge && systemBridge.cpuUsage !== null
      ? Math.round(systemBridge.cpuUsage) + "%" : "--"
    var memory = systemBridge && systemBridge.memoryPercent !== null
      ? Math.round(systemBridge.memoryPercent) + "%" : "--"
    var load = systemBridge && systemBridge.cpuLoad !== null
      ? systemBridge.cpuLoad.toFixed(2) : "--"
    var temperature = systemBridge && systemBridge.cpuTemperature !== null
      ? Math.round(systemBridge.cpuTemperature) + " °C" : "--"
    return [
      "Status: " + status,
      "CPU: " + cpu,
      "Memory: " + memory,
      "Load: " + load,
      "CPU temperature: " + temperature
    ].join("\n")
  }

  function activeWidget() {
    if (root.activeInstance) return root
    var items = root.bar && typeof root.bar.moduleWidgets === "function"
      ? root.bar.moduleWidgets(root.moduleName) : []
    for (var i = 0; i < items.length; i++)
      if (items[i] && items[i].activeInstance === true) return items[i]
    return null
  }

  function open() {
    var widget = activeWidget()
    if (widget && widget !== root) { widget.open(); return }
    if (panelLoader.item) {
      openWhenPanelLoads = false
      panelLoader.item.open()
      return
    }
    openWhenPanelLoads = true
    panelLoader.active = true
  }
  function close() {
    var widget = activeWidget()
    if (widget && widget !== root) { widget.close(); return }
    openWhenPanelLoads = false
    if (panelLoader.item) panelLoader.item.close()
  }
  function togglePanel() {
    var widget = activeWidget()
    if (widget && widget !== root) { widget.togglePanel(); return }
    if (panelLoader.item && panelLoader.item.opened) panelLoader.item.close()
    else open()
  }
  function closeForPopoutSwitch() {
    var widget = activeWidget()
    if (widget && widget !== root) { widget.closeForPopoutSwitch(); return }
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }
  function injectPanel() {
    var panel = panelLoader.item
    if (!panel) return
    panel.bar = root.bar
    panel.settings = root.settings
    panel.anchorItem = button
    panel.hostWidget = root
    panel.service = root.systemBridge
  }

  visible: activeInstance
  implicitWidth: activeInstance ? button.implicitWidth : 0
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()
  onSystemBridgeChanged: injectPanel()

  Loader {
    id: panelLoader
    active: false
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
      if (root.openWhenPanelLoads) {
        root.openWhenPanelLoads = false
        item.open()
      }
    }
  }

  Loader {
    active: root.activeInstance
    sourceComponent: Component {
      IpcHandler {
        target: "timmo.system-bridge"
        function open(): void { root.open() }
        function close(): void { root.close() }
        function show(): void { root.open() }
        function hide(): void { root.close() }
        function toggle(): void { root.togglePanel() }
      }
    }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    fontSize: 10
    text: root.displayText
    labelVisible: false
    fixedWidth: vertical ? -1 : Math.max(12,
      content.implicitWidth + scaledHorizontalMargin * 2)
    foreground: root.displayColor
    tooltipText: root.tooltipText
    horizontalMargin: 6
    onPressed: root.togglePanel()

    Row {
      id: content
      anchors.centerIn: parent
      spacing: Style.space(10)

      Text {
        text: !root.systemBridge || !root.systemBridge.connected
          ? " --%"
          : " " + (root.systemBridge.cpuUsage === null
            ? "--" : Math.round(root.systemBridge.cpuUsage)) + "%"
        color: root.displayColor
        font.family: button.fontFamily
        font.pixelSize: button.fontSize
        renderType: Text.NativeRendering
      }

      Text {
        text: !root.systemBridge || !root.systemBridge.connected
          ? " --%"
          : " " + (root.systemBridge.memoryPercent === null
            ? "--" : Math.round(root.systemBridge.memoryPercent)) + "%"
        color: root.displayColor
        font.family: button.fontFamily
        font.pixelSize: button.fontSize
        renderType: Text.NativeRendering
      }
    }
  }
}
