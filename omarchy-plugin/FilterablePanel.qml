import QtQuick
import qs.Commons

Item {
  id: root

  property var model: []
  property var navigationModel: null
  property string filterText: ""
  property int cursorIndex: 0
  property string cursorKey: ""
  property bool cursorStartsActive: true
  property bool cursorActive: cursorStartsActive
  property bool backOnEmptyFilter: false
  property bool keyboardEnabled: true
  property bool bypassFilter: false

  readonly property var filteredModel: bypassFilter ? (model || []) : filterModel(model, filterText)
  readonly property var navigationEntries: navigationModel === null ? filteredModel : navigationModel
  readonly property int count: filteredModel.length

  signal activateRequested(var entry, int modifiers)
  signal closeRequested()
  signal backRequested()
  signal refreshRequested()
  signal tabRequested(int direction)
  signal revealRequested()

  focus: true
  Keys.priority: Keys.BeforeItem
  Keys.enabled: keyboardEnabled

  onCursorIndexChanged: cursorKey = navigationEntries[cursorIndex]?.key || ""
  onFilteredModelChanged: {
    clampCursor()
    revealRequested()
  }
  onNavigationEntriesChanged: {
    var index = indexForKey(cursorKey)
    if (index >= 0) cursorIndex = index
    else clampCursor()
    cursorKey = navigationEntries[cursorIndex]?.key || ""
    revealRequested()
  }

  function filterModel(entries, query) {
    var term = String(query || "").trim().toLowerCase()
    if (!term) return entries || []
    var source = entries || []
    var matches = source.filter(function(entry) {
      return entry.navigation === true
        || [entry.primaryText, entry.secondaryText, entry.tertiaryText].join(" ").toLowerCase().indexOf(term) >= 0
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

  function firstCursorIndex() {
    var index = navigationEntries.findIndex(function(entry) { return entry.navigation !== true })
    return index < 0 ? 0 : index
  }

  function reset() {
    filterText = ""
    cursorIndex = firstCursorIndex()
    cursorActive = cursorStartsActive
  }

  function setFilter(nextFilter) {
    filterText = nextFilter
    cursorIndex = firstCursorIndex()
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

  function deletesLastCharacter(text) {
    var end = text.length - 1
    if (end > 0) {
      var trailingCode = text.charCodeAt(end)
      var precedingCode = text.charCodeAt(end - 1)
      if (trailingCode >= 0xDC00 && trailingCode <= 0xDFFF
          && precedingCode >= 0xD800 && precedingCode <= 0xDBFF) end--
    }
    return text.slice(0, Math.max(0, end))
  }

  Keys.onPressed: function(event) {
    if (event.key === Qt.Key_Escape) {
      if (root.filterText) root.setFilter("")
      else root.closeRequested()
      event.accepted = true
    } else if (event.key === Qt.Key_Tab || event.key === Qt.Key_Backtab) {
      root.tabRequested((event.modifiers & Qt.ShiftModifier) || event.key === Qt.Key_Backtab ? -1 : 1)
      event.accepted = true
    } else if (event.key === Qt.Key_Backspace && !root.filterText && root.backOnEmptyFilter) {
      root.backRequested()
      event.accepted = true
    } else if (Util.editsFilter(event, root.filterText)) {
      root.setFilter(event.key === Qt.Key_Backspace && !(event.modifiers & Qt.ControlModifier)
        ? root.deletesLastCharacter(root.filterText)
        : Util.editedFilter(event, root.filterText))
      event.accepted = true
    } else if (event.key === Qt.Key_Up) {
      root.moveCursor(-1)
      event.accepted = true
    } else if (event.key === Qt.Key_Down) {
      root.moveCursor(1)
      event.accepted = true
    } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
      var entry = root.selectedEntry()
      if (entry) root.activateRequested(entry, event.modifiers)
      event.accepted = true
    } else if (event.key === Qt.Key_R && event.modifiers === Qt.ControlModifier) {
      root.refreshRequested()
      event.accepted = true
    } else if (event.text && !/[\u0000-\u001f\u007f]/.test(event.text)
        && (event.modifiers === Qt.NoModifier || event.modifiers === Qt.ShiftModifier)) {
      root.setFilter(root.filterText + event.text)
      event.accepted = true
    }
  }
}
