import QtQuick

Flickable {
  id: root

  // Touchpad: content moves this many times the (Hyprland-scaled) pixel delta.
  property real touchpadMultiplier: 6
  // Mouse wheel: pixels moved per notch, animated so it stays smooth.
  property real wheelStep: 92
  property real wheelTarget: 0

  function clampContentY(value) {
    return Math.max(root.originY, Math.min(
      root.originY + root.contentHeight - root.height, value))
  }

  NumberAnimation {
    id: wheelAnimation
    target: root
    property: "contentY"
    duration: 200
    easing.type: Easing.OutCubic
  }

  MouseArea {
    parent: root
    anchors.fill: parent
    acceptedButtons: Qt.NoButton
    enabled: root.interactive && root.contentHeight > root.height

    onWheel: function(event) {
      if (event.pixelDelta.y !== 0) {
        wheelAnimation.stop()
        root.cancelFlick()
        root.contentY = root.clampContentY(
          root.contentY - event.pixelDelta.y * root.touchpadMultiplier)
        event.accepted = true
        return
      }
      if (event.angleDelta.y === 0) {
        event.accepted = false
        return
      }
      // Build on the pending target so fast notches add up instead of restarting.
      const from = wheelAnimation.running ? root.wheelTarget : root.contentY
      root.wheelTarget = root.clampContentY(
        from - event.angleDelta.y / 120 * root.wheelStep)
      root.cancelFlick()
      wheelAnimation.stop()
      wheelAnimation.to = root.wheelTarget
      wheelAnimation.start()
      event.accepted = true
    }
  }
}
