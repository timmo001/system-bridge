import QtQuick
import qs.Commons
import qs.Commons as Commons
import qs.Ui

// A heading between groups in a panel, with an optional icon, refresh button
// and collapse toggle.
Rectangle {
  id: root

  required property string title
  // Optional glyph shown before the title.
  property string icon: ""
  property color foreground: Commons.Color.foreground
  property string fontFamily: Style.font.family
  property bool refreshable: false
  property bool refreshing: false
  property bool hasCursor: false
  property Component trailingControl: null
  // Collapsible headings show a chevron and toggle when clicked; the owner keeps the state.
  property bool collapsible: false
  property bool expanded: true
  property bool toggleHasCursor: false
  // The refresh button's tooltip, for a panel in another language.
  property string refreshLabel: "Refresh " + title.toLowerCase()
  property string refreshingLabel: "Refreshing " + title.toLowerCase()
  // The glyphs, for a panel on another icon font.
  property string refreshIcon: "󰑐"
  property string expandedIcon: "󰅀"
  property string collapsedIcon: "󰅂"
  // The fill and border's opacity over `foreground`, and the border's under the cursor.
  property real fillAlpha: 0.06
  property real borderAlpha: 0.16
  property real cursorBorderAlpha: 0.4

  signal refreshRequested()
  signal refreshHovered()
  signal toggleRequested()
  // Sends the global pointer position so panels can ignore hover from rows moving under a still pointer.
  signal toggleHovered(point globalPoint)

  width: parent.width
  implicitHeight: Math.max(titleText.implicitHeight, refreshButton.implicitHeight, trailingLoader.implicitHeight) + Style.space(12)
  radius: 0
  color: toggleHasCursor ? Style.hoverFillFor(foreground, foreground) : Qt.rgba(foreground.r, foreground.g, foreground.b, fillAlpha)
  border.width: 1
  border.color: Qt.rgba(foreground.r, foreground.g, foreground.b, toggleHasCursor ? cursorBorderAlpha : borderAlpha)

  Text {
    id: titleText
    anchors.left: parent.left
    anchors.leftMargin: Style.space(12)
    anchors.right: trailingLoader.item && trailingLoader.item.visible ? trailingLoader.left : (refreshButton.visible ? refreshButton.left : parent.right)
    anchors.rightMargin: Style.space(12)
    anchors.verticalCenter: parent.verticalCenter
    text: (root.collapsible ? (root.expanded ? root.expandedIcon : root.collapsedIcon) + " " : "") + (root.icon ? root.icon + "  " : "") + root.title.toUpperCase()
    textFormat: Text.PlainText
    elide: Text.ElideRight
    color: Qt.darker(root.foreground, 1.15)
    font.family: root.fontFamily
    font.pixelSize: Style.font.caption
    font.bold: true
    font.letterSpacing: 1.2
  }

  MouseArea {
    id: toggleArea
    anchors.fill: parent
    visible: root.collapsible
    hoverEnabled: true
    cursorShape: Qt.PointingHandCursor
    onPositionChanged: function(mouse) { root.toggleHovered(toggleArea.mapToGlobal(mouse.x, mouse.y)) }
    onClicked: root.toggleRequested()
  }

  Loader {
    id: trailingLoader
    sourceComponent: root.trailingControl
    anchors.right: refreshButton.visible ? refreshButton.left : parent.right
    anchors.rightMargin: Style.space(refreshButton.visible ? 4 : 8)
    anchors.verticalCenter: parent.verticalCenter
  }

  PanelActionButton {
    id: refreshButton
    anchors.right: parent.right
    anchors.rightMargin: Style.space(8)
    anchors.verticalCenter: parent.verticalCenter
    visible: root.refreshable
    enabled: !root.refreshing
    iconText: root.refreshIcon
    tooltipText: root.refreshing ? root.refreshingLabel : root.refreshLabel
    foreground: Qt.darker(root.foreground, 1.15)
    fontFamily: root.fontFamily
    hasCursor: root.hasCursor
    onHovered: function(hovered) { if (hovered) root.refreshHovered() }
    onClicked: root.refreshRequested()
  }
}
