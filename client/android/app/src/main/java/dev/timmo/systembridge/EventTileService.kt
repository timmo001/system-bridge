/**
 * A quick settings tile that runs one event on the current computer without
 * opening the app, such as locking it. With nothing paired, or the local
 * network not allowed yet, a tap opens the app, whose pairing page sorts it.
 */
package dev.timmo.systembridge

import android.content.pm.PackageManager
import android.os.Build
import android.service.quicksettings.Tile
import dev.timmo.groundwork.shell.ShellActivity
import dev.timmo.groundwork.shell.ShellTileService

abstract class EventTileService(
  private val event: String,
  /** What the tile says while the event runs and once it has, as string resources. */
  private val running: Int,
  private val done: Int,
) : ShellTileService() {
  override fun onStartListening() {
    super.onStartListening()
    show(Servers.current(this)?.name)
  }

  override fun onClick() {
    val server = Servers.current(this)
    val allowed =
      Build.VERSION.SDK_INT < 37 ||
        checkSelfPermission(ShellActivity.ACCESS_LOCAL_NETWORK) == PackageManager.PERMISSION_GRANTED

    if (server == null || !allowed) return super.onClick()

    show(getString(running), Tile.STATE_ACTIVE)
    Api.event(server, event) { ok ->
      show(if (ok) getString(done) else getString(R.string.tile_unreachable, server.name))
    }
  }

  private fun show(subtitle: String?, state: Int = Tile.STATE_INACTIVE) {
    qsTile?.apply {
      this.state = state
      this.subtitle = subtitle
      updateTile()
    }
  }
}

class LockTileService : EventTileService("POWER_LOCK", R.string.tile_locking, R.string.tile_locked)

class SleepTileService : EventTileService("POWER_SLEEP", R.string.tile_sleeping, R.string.tile_asleep)
