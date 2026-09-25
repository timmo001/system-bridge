import QtQuick

Flickable {
  id: root

  WheelHandler {
    parent: root
    target: null
    acceptedDevices: PointerDevice.Mouse | PointerDevice.TouchPad
    enabled: root.interactive && root.contentHeight > root.height

    onWheel: function(event) {
      // Touchpads supply pixel deltas; leave mouse-wheel steps to Flickable.
      if (event.pixelDelta.y === 0) {
        event.accepted = false
        return
      }
      root.cancelFlick()
      root.contentY = Math.max(root.originY, Math.min(
        root.originY + root.contentHeight - root.height,
        root.contentY - event.pixelDelta.y * 3))
      event.accepted = true
    }
  }
}
