import QtQuick
import QtQuick.Controls
import qs.Commons
import qs.Commons as Commons
import qs.Ui

Panel {
  id: root
  moduleName: "timmo.system-bridge"

  property var anchorItem: null
  property var hostWidget: null
  property var service: null
  // The module whose view is open, or "" for the overview.
  property string view: ""
  readonly property var barIdentity: hostWidget || root
  readonly property color contentForeground: bar ? bar.foreground : Commons.Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property color warningColor: "#e5c07b"
  readonly property color dangerColor: bar ? bar.urgent : Commons.Color.urgent
  readonly property var viewInfo: view === "" ? null : rowBuilder.moduleInfo(view)
  readonly property var panelRows: !service ? []
    : (view === "" ? rowBuilder.overview(service) : rowBuilder.moduleRows(service, view))
  readonly property bool filtering: filterController.filterText !== ""
  // Sections the user collapsed, by view, kept while the shell runs.
  property var collapsedSections: ({})
  // The filtered rows with a heading before each section. Collapsed sections
  // keep only their heading, and a filter shows every match.
  readonly property var displayRows: buildDisplayRows(filterController.filteredModel)
  readonly property bool connected: service !== null && service.connected
  readonly property string serverActionKey: connected ? "action:quit" : "action:start"
  // Header actions sit before the rows; they're flagged as navigation so the
  // cursor starts on the first row and Up from it reaches them.
  readonly property var headerActions: (view === "" ? [] : [{ key: "action:back", navigation: true }])
    .concat([{ key: "action:web", navigation: true }, { key: serverActionKey, navigation: true }])
  readonly property string webPath: view === "" ? "/" : "/" + view
  readonly property string cursorKey: filterController.selectedEntry() ? filterController.selectedEntry().key : ""

  PanelRows { id: rowBuilder }

  function sectionKey(section) { return view + "/" + section }
  function sectionExpanded(section) { return collapsedSections[sectionKey(section)] !== true }
  function toggleSection(section) {
    var next = Object.assign({}, collapsedSections)
    next[sectionKey(section)] = sectionExpanded(section)
    collapsedSections = next
  }

  function buildDisplayRows(rows) {
    var display = []
    var section = ""
    for (var i = 0; i < rows.length; i++) {
      var entry = rows[i]
      if (entry.section !== "" && entry.section !== section)
        display.push(rowBuilder.row({ key: "toggle:" + entry.section, kind: "toggle", section: entry.section, primaryText: entry.section }))
      section = entry.section
      if (entry.section === "" || filtering || sectionExpanded(entry.section)) display.push(entry)
    }
    return display
  }

  // Starts on the first row rather than a section heading, so Enter opens
  // something instead of collapsing the first section.
  function resetCursor() {
    filterController.reset()
    var index = filterController.navigationEntries.findIndex(function(entry) {
      return entry.navigation !== true && entry.kind !== "toggle"
    })
    if (index >= 0) filterController.cursorIndex = index
  }

  function openWeb(path) {
    Util.execArgv(["system-bridge", "client", "open", "--path", path])
  }

  function showView(module) {
    view = module
    resetCursor()
    Qt.callLater(function() { panelFlick.contentY = 0 })
  }

  function activateEntry(entry) {
    if (!root.opened || !entry || entry.disabled) return
    if (entry.key === "action:back") {
      root.showView("")
      return
    }
    if (entry.key === "action:web") {
      if (!root.connected) return
      root.close()
      root.openWeb(root.webPath)
      return
    }
    if (entry.key === "action:quit") {
      if (!root.connected) return
      root.close()
      Util.execArgv(["system-bridge", "client", "quit", "--yes"])
      return
    }
    if (entry.key === "action:start") {
      if (root.connected) return
      root.close()
      Util.execArgv(["system-bridge", "backend"])
      return
    }
    if (entry.kind === "toggle") {
      root.toggleSection(entry.section)
    } else if (entry.kind === "module") {
      root.showView(entry.target)
    } else if (entry.kind === "web") {
      if (!root.connected) return
      root.close()
      root.openWeb(entry.target)
    } else if (entry.kind === "url") {
      root.close()
      Util.execArgv(["xdg-open", entry.target])
    } else if (entry.kind === "control") {
      // Stay open so the change shows when System Bridge reports it.
      if (root.connected) Util.execArgv(entry.target)
    }
  }

  function actionable(entry) {
    return !!entry && !entry.disabled && entry.kind !== ""
  }

  function meterColor(level) {
    if (level === "danger") return dangerColor
    if (level === "warning") return warningColor
    return contentForeground
  }

  function formatLastUpdated(timestamp, currentTime) {
    if (timestamp <= 0) return ""
    var elapsedSeconds = Math.max(0, Math.floor((currentTime - timestamp) / 1000))
    if (elapsedSeconds < 10) return "Last updated just now"
    if (elapsedSeconds < 60) return "Last updated " + elapsedSeconds + "s ago"
    var elapsedMinutes = Math.floor(elapsedSeconds / 60)
    if (elapsedMinutes < 60) return "Last updated " + elapsedMinutes + "m ago"
    return "Last updated " + Math.floor(elapsedMinutes / 60) + "h ago"
  }

  function open() {
    view = ""
    resetCursor()
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
    if (entry.navigation === true) return header
    return rowRepeater.itemAt(root.displayRows.indexOf(entry))
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
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight, panel.screenH * 0.8)

    FilterablePanel {
      id: filterController
      anchors.fill: parent
      model: root.panelRows
      // Headings are only reachable while they can collapse, so not under a filter.
      navigationModel: root.headerActions.concat(root.filtering
        ? root.displayRows.filter(function(entry) { return entry.kind !== "toggle" })
        : root.displayRows)
      backOnEmptyFilter: root.view !== ""
      onActivateRequested: function(entry) { root.activateEntry(entry) }
      onBackRequested: root.showView("")
      onRevealRequested: Qt.callLater(root.scrollCursorIntoView)
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      PanelFlickable {
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

          PanelHeader {
            id: header
            title: root.viewInfo ? root.viewInfo.label
              : (root.service && root.service.hostname !== "" ? root.service.hostname : "System Bridge")
            meta: root.connected
              ? root.formatLastUpdated(root.service.lastUpdateAt, root.service.currentTime)
                + (root.service.stale ? " · Data is stale" : "")
              : "Waiting for System Bridge"
            foreground: root.contentForeground
            fontFamily: root.contentFontFamily
            iconOpacity: root.connected ? 1 : 0.5
            backText: root.view === "" ? "" : "Back to overview"
            backHasCursor: root.cursorKey === "action:back"
            onBackActivated: root.activateEntry({ key: "action:back" })
            onBackHovered: filterController.cursorIndex = filterController.indexForKey("action:back")
            iconComponent: Component {
              Text {
                text: root.viewInfo ? root.viewInfo.icon : "\u{F0A1D}"
                color: root.hostWidget ? root.hostWidget.displayColor : root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.display
              }
            }
            trailingControl: Component {
              Row {
                spacing: Style.space(4)

                // The status sits with the buttons, not in the title row, so
                // they all share one centre line.
                BorderSurface {
                  anchors.verticalCenter: parent.verticalCenter
                  implicitWidth: statusText.implicitWidth + Style.space(10)
                  implicitHeight: statusText.implicitHeight + Style.space(4)
                  color: "transparent"
                  borderSpec: Border.controlSpec("normal", root.contentForeground, Commons.Color.accent)
                  radius: Style.cornerRadius

                  Text {
                    id: statusText
                    textFormat: Text.PlainText
                    anchors.centerIn: parent
                    text: root.connected ? "ONLINE" : "OFFLINE"
                    color: Qt.darker(root.contentForeground, 1.4)
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.body
                    font.bold: true
                  }
                }

                // Space between the status and the buttons.
                Item {
                  width: Style.space(4)
                  height: 1
                }

                PanelActionButton {
                  anchors.verticalCenter: parent.verticalCenter
                  enabled: root.connected
                  iconText: "󰖟"
                  tooltipText: root.viewInfo
                    ? "Open " + root.viewInfo.label + " in the web client"
                    : "Open the web client"
                  foreground: root.contentForeground
                  fontFamily: root.contentFontFamily
                  hasCursor: root.cursorKey === "action:web"
                  onHovered: function(hovered) { if (hovered) filterController.cursorIndex = filterController.indexForKey("action:web") }
                  onClicked: root.activateEntry({ key: "action:web" })
                }

                PanelActionButton {
                  anchors.verticalCenter: parent.verticalCenter
                  iconText: root.connected ? "󰩈" : ""
                  tooltipText: root.connected ? "Quit System Bridge" : "Start System Bridge"
                  foreground: root.contentForeground
                  fontFamily: root.contentFontFamily
                  hasCursor: root.cursorKey === root.serverActionKey
                  onHovered: function(hovered) { if (hovered) filterController.cursorIndex = filterController.indexForKey(root.serverActionKey) }
                  onClicked: root.activateEntry({ key: root.serverActionKey })
                }
              }
            }
          }

          Column {
            width: parent.width
            spacing: Style.space(2)

            Repeater {
              id: rowRepeater
              model: root.displayRows

              Column {
                id: rowItem
                required property int index
                required property var modelData
                readonly property bool isHeading: modelData.kind === "toggle"
                width: contentColumn.width
                spacing: Style.space(2)

                SectionHeading {
                  visible: rowItem.isHeading
                  title: rowItem.modelData.section
                  foreground: root.contentForeground
                  fontFamily: root.contentFontFamily
                  collapsible: rowItem.isHeading && !root.filtering
                  expanded: root.sectionExpanded(rowItem.modelData.section)
                  toggleHasCursor: rowItem.isHeading && root.cursorKey === rowItem.modelData.key
                  onToggleHovered: filterController.cursorIndex = filterController.indexForKey(rowItem.modelData.key)
                  onToggleRequested: root.activateEntry(rowItem.modelData)
                }

                CursorSurface {
                  visible: !rowItem.isHeading
                  width: parent.width
                  implicitHeight: rowColumn.implicitHeight + Style.space(12)
                  hasCursor: filterController.cursorIndex === filterController.indexForKey(rowItem.modelData.key)
                  foreground: root.contentForeground
                  accent: root.contentForeground
                  opacity: rowItem.modelData.disabled ? 0.5 : 1

                  Row {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.verticalCenter: parent.verticalCenter
                    anchors.leftMargin: Style.space(8)
                    anchors.rightMargin: Style.space(8)
                    spacing: Style.space(10)

                    Text {
                      width: Style.space(22)
                      text: rowItem.modelData.icon
                      color: root.contentForeground
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.icon
                      horizontalAlignment: Text.AlignHCenter
                    }

                    Column {
                      id: rowColumn
                      width: Math.max(0, parent.width - Style.space(32) - (chevron.visible ? chevron.width + Style.space(10) : 0))
                      spacing: Style.space(2)

                      Text {
                        width: parent.width
                        text: rowItem.modelData.primaryText
                        color: root.contentForeground
                        font.family: root.contentFontFamily
                        font.pixelSize: Style.font.body
                        font.bold: true
                        elide: Text.ElideRight
                      }

                      Text {
                        visible: text !== ""
                        width: parent.width
                        text: rowItem.modelData.secondaryText
                        color: Qt.darker(root.contentForeground, 1.4)
                        font.family: root.contentFontFamily
                        font.pixelSize: Style.font.caption
                        elide: Text.ElideRight
                      }

                      Rectangle {
                        id: meterTrack
                        visible: rowItem.modelData.meter !== null
                        width: parent.width
                        height: Style.space(4)
                        radius: height / 2
                        color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.12)

                        Rectangle {
                          width: parent.width * Math.max(0, Math.min(100, Number(rowItem.modelData.meter) || 0)) / 100
                          height: parent.height
                          radius: parent.radius
                          color: root.meterColor(rowItem.modelData.meterLevel)
                        }
                      }
                    }

                    // Shows where selecting the row goes: a view, or the web.
                    Text {
                      id: chevron
                      visible: rowItem.modelData.kind === "module" || rowItem.modelData.kind === "web" || rowItem.modelData.kind === "url"
                      anchors.verticalCenter: parent.verticalCenter
                      text: rowItem.modelData.kind === "module" ? "󰅂" : "󰏌"
                      color: Qt.darker(root.contentForeground, 1.4)
                      font.family: root.contentFontFamily
                      font.pixelSize: Style.font.caption
                    }
                  }

                  MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: root.actionable(rowItem.modelData) ? Qt.PointingHandCursor : Qt.ArrowCursor
                    onEntered: filterController.cursorIndex = filterController.indexForKey(rowItem.modelData.key)
                    onClicked: root.activateEntry(rowItem.modelData)
                  }
                }
              }
            }
          }

          Text {
            visible: filterController.count === 0
            width: parent.width
            text: filterController.filterText
              ? "No matches for “" + filterController.filterText + "”"
              : (root.connected ? "No data available" : "System Bridge is offline")
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
