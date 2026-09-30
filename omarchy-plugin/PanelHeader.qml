import QtQuick
import qs.Commons
import qs.Ui

// PanelHero with an optional leading back button. Panels keep the back entry
// in their cursor model (flagged `navigation: true`) so Up from the first row
// reaches it, while FilterablePanel starts the cursor on the first real action.
Item {
  id: root

  property Component iconComponent: null
  property Component trailingControl: null
  property string title: ""
  property string meta: ""
  property string detail: ""
  property color foreground: Color.foreground
  property string fontFamily: Style.font.family
  property real iconOpacity: 1.0
  property string backText: ""
  property bool backHasCursor: false

  signal backActivated()
  signal backHovered()

  width: parent ? parent.width : implicitWidth
  implicitHeight: Math.max(backButton.visible ? backButton.implicitHeight : 0, hero.implicitHeight)

  PanelActionButton {
    id: backButton
    visible: root.backText !== ""
    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    iconText: "󰁍"
    foreground: root.foreground
    fontFamily: root.fontFamily
    hasCursor: root.backHasCursor

    property bool pointerInside: false

    onHovered: function(isHovered) {
      pointerInside = isHovered
      if (isHovered) root.backHovered()
    }
    onClicked: root.backActivated()

    // Also shown for the keyboard cursor, since the button has no visible label.
    PanelToolTip {
      visible: backButton.visible && (backButton.pointerInside || root.backHasCursor)
      text: root.backText
      fontFamily: root.fontFamily
    }
  }

  PanelHero {
    id: hero
    anchors.left: backButton.visible ? backButton.right : parent.left
    anchors.leftMargin: backButton.visible ? Style.space(10) : 0
    anchors.right: parent.right
    anchors.verticalCenter: parent.verticalCenter
    iconComponent: root.iconComponent
    iconOpacity: root.iconOpacity
    trailingControl: root.trailingControl
    title: root.title
    meta: root.meta
    detail: root.detail
    foreground: root.foreground
    fontFamily: root.fontFamily
  }
}
