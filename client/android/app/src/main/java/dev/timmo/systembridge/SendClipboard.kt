/**
 * Sends the phone's clipboard to the computer in use. Android only lets the
 * app in the foreground read the clipboard, so the tile opens an invisible
 * activity that reads it once it has focus, sends it as CLIPBOARD_SET_TEXT,
 * says how that went and closes.
 */
package dev.timmo.systembridge

import android.app.PendingIntent
import android.content.ClipboardManager
import android.content.Intent
import android.service.quicksettings.Tile
import android.widget.Toast
import androidx.activity.ComponentActivity
import dev.timmo.groundwork.shell.ShellTileService
import org.json.JSONObject

class ClipboardTileService : ShellTileService() {
  override fun onStartListening() {
    super.onStartListening()
    qsTile?.apply {
      state = Tile.STATE_INACTIVE
      subtitle = Servers.current(this@ClipboardTileService)?.name
      updateTile()
    }
  }

  override fun onClick() {
    if (Servers.current(this) == null) return super.onClick()

    val send = Intent(this, SendClipboardActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    startActivityAndCollapse(
      PendingIntent.getActivity(this, 0, send, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    )
  }
}

class SendClipboardActivity : ComponentActivity() {
  private var sent = false

  /** The clipboard can only be read once the window has focus. */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)

    if (!hasFocus || sent) return

    sent = true

    val clip = getSystemService(ClipboardManager::class.java).primaryClip
    val text = clip?.takeIf { found -> found.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString()

    if (text.isNullOrEmpty()) return done(getString(R.string.clipboard_empty))

    val servers = Servers.all(this)

    if (servers.size > 1) {
      Api.inUse(servers) { inUse -> send(inUse ?: Servers.current(this), text) }
    } else {
      send(Servers.current(this), text)
    }
  }

  private fun send(server: Server?, text: String) {
    if (server == null) return done(getString(R.string.clipboard_no_computer))

    Api.event(server, "CLIPBOARD_SET_TEXT", JSONObject().put("text", text)) { ok ->
      done(getString(if (ok) R.string.clipboard_sent else R.string.tile_unreachable, server.name))
    }
  }

  private fun done(message: String) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    finish()
  }
}
