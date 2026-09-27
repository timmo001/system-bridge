import QtQuick
import qs.Commons

Item {
  id: root

  property var model: []
  property var navigationModel: null
  property string filterText: ""
  property int cursorIndex: 0
  property bool cursorStartsActive: true
  property bool cursorActive: cursorStartsActive

  readonly property var filteredModel: filterModel(model, filterText)
  readonly property var navigationEntries: navigationModel === null ? filteredModel : navigationModel
  readonly property int count: filteredModel.length

  signal activateRequested(var entry)
  signal closeRequested()
  signal refreshRequested()
  signal tabRequested(int direction)
  signal revealRequested()

  focus: true
  Keys.priority: Keys.BeforeItem

  onFilteredModelChanged: {
    clampCursor()
    revealRequested()
  }
  onNavigationEntriesChanged: {
    clampCursor()
    revealRequested()
  }

  function filterModel(entries, query) {
    var term = String(query || "").trim().toLowerCase()
    if (!term) return entries || []
    var source = entries || []
    var matches = source.filter(function(entry) {
      return [entry.primaryText, entry.secondaryText].join(" ").toLowerCase().indexOf(term) >= 0
    })
    return matches.sort(function(a, b) {
      var aSection = String(a.section || "")
      var bSection = String(b.section || "")
      if (aSection !== bSection) {
        var aSectionIndex = source.findIndex(function(entry) { return String(entry.section || "") === aSection })
        var bSectionIndex = source.findIndex(function(entry) { return String(entry.section || "") === bSection })
        return aSectionIndex - bSectionIndex
      }
      var aPrimary = String(a.primaryText || "").toLowerCase().indexOf(term) >= 0
      var bPrimary = String(b.primaryText || "").toLowerCase().indexOf(term) >= 0
      if (aPrimary !== bPrimary) return aPrimary ? -1 : 1
      return source.indexOf(a) - source.indexOf(b)
    })
  }

  function reset() {
    filterText = ""
    cursorIndex = 0
    cursorActive = cursorStartsActive
  }

  function setFilter(nextFilter) {
    filterText = nextFilter
    cursorIndex = 0
    cursorActive = cursorStartsActive
  }

  function clampCursor() {
    cursorIndex = Math.max(0, Math.min(cursorIndex, Math.max(0, navigationEntries.length - 1)))
  }

  function moveCursor(delta) {
    if (navigationEntries.length <= 0) return
    if (!cursorActive) cursorIndex = delta < 0 ? navigationEntries.length - 1 : 0
    else cursorIndex = Math.max(0, Math.min(cursorIndex + delta, navigationEntries.length - 1))
    cursorActive = true
    revealRequested()
  }

  function selectIndex(index) {
    if (index < 0 || index >= navigationEntries.length) return
    cursorIndex = index
    cursorActive = true
  }

  function selectedEntry() {
    return cursorActive && cursorIndex >= 0 && cursorIndex < navigationEntries.length
      ? navigationEntries[cursorIndex] : null
  }

  function indexForKey(key) {
    for (var i = 0; i < navigationEntries.length; i++) {
      if (navigationEntries[i].key === key) return i
    }
    return -1
  }

  Keys.onPressed: function(event) {
    if (event.key === Qt.Key_Escape) {
      if (root.filterText) root.setFilter("")
      else root.closeRequested()
      event.accepted = true
    } else if (event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab) {
      root.tabRequested((event.modifiers & Qt.ShiftModifier) || event.key === Qt.Key_Backtab ? -1 : 1)
      event.accepted = true
    } else if (Util.editsFilter(event, root.filterText)) {
      root.setFilter(Util.editedFilter(event, root.filterText))
      event.accepted = true
    } else if (event.key === Qt.Key_Up) {
      root.moveCursor(-1)
      event.accepted = true
    } else if (event.key === Qt.Key_Down) {
      root.moveCursor(1)
      event.accepted = true
    } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
      var entry = root.selectedEntry()
      if (entry) root.activateRequested(entry)
      event.accepted = true
    } else if (event.key === Qt.Key_R && event.modifiers === Qt.ControlModifier) {
      root.refreshRequested()
      event.accepted = true
    } else if (event.text && event.text.length === 1
        && event.text.charCodeAt(0) >= 32 && event.text.charCodeAt(0) !== 127
        && (event.modifiers === Qt.NoModifier || event.modifiers === Qt.ShiftModifier)) {
      root.setFilter(root.filterText + event.text)
      event.accepted = true
    }
  }
}
