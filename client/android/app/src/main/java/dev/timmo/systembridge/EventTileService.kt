/**
 * Quick settings tiles that act on the current computer without opening the
 * app. Lock and Sleep run one event. Keep awake, Mute and Play/pause show
 * the computer's state, read from one of its modules as the tile appears,
 * and switch it. With nothing paired, or the local network not allowed yet,
 * a tap opens the app, whose pairing page sorts it.
 */
package dev.timmo.systembridge

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.service.quicksettings.Tile
import dev.timmo.groundwork.shell.ShellActivity
import dev.timmo.groundwork.shell.ShellTileService
import org.json.JSONObject

/** The current computer, when the app may reach it. */
private fun Context.reachable(): Server? {
  val allowed =
    Build.VERSION.SDK_INT < 37 ||
      checkSelfPermission(ShellActivity.ACCESS_LOCAL_NETWORK) == PackageManager.PERMISSION_GRANTED

  return Servers.current(this)?.takeIf { allowed }
}

private fun ShellTileService.show(subtitle: String?, state: Int) {
  qsTile?.apply {
    this.state = state
    this.subtitle = subtitle
    updateTile()
  }
}

abstract class EventTileService(
  private val event: String,
  /** What the tile says while the event runs and once it has, as string resources. */
  private val running: Int,
  private val done: Int,
) : ShellTileService() {
  override fun onStartListening() {
    super.onStartListening()
    show(Servers.current(this)?.name, Tile.STATE_INACTIVE)
  }

  override fun onClick() {
    val server = reachable() ?: return super.onClick()

    show(getString(running), Tile.STATE_ACTIVE)
    Api.event(server, event) { ok ->
      show(if (ok) getString(done) else getString(R.string.tile_unreachable, server.name), Tile.STATE_INACTIVE)
    }
  }
}

class LockTileService : EventTileService("POWER_LOCK", R.string.tile_locking, R.string.tile_locked)

class SleepTileService : EventTileService("POWER_SLEEP", R.string.tile_sleeping, R.string.tile_asleep)

/**
 * A tile that's on or off with something on the computer, such as keep
 * awake: it reads `module` as it appears, and a tap sends the event that
 * switches it, then reads it again.
 */
abstract class ToggleTileService(private val module: String) : ShellTileService() {
  /** Whether it's on, from the module's data, or null where the computer can't say. */
  protected abstract fun isOn(data: JSONObject): Boolean?

  /** The event and its data that switch it on or off, or null where it can't. */
  protected abstract fun switchTo(data: JSONObject, on: Boolean): Pair<String, JSONObject>?

  override fun onStartListening() {
    super.onStartListening()

    val server = reachable() ?: return show(Servers.current(this)?.name, Tile.STATE_INACTIVE)

    refresh(server)
  }

  override fun onClick() {
    val server = reachable() ?: return super.onClick()

    Api.module(server, module) { data ->
      if (data == null) return@module unreachable(server)

      val on = isOn(data)
      val request = on?.let { current -> switchTo(data, !current) } ?: return@module unsupported(server)

      show(server.name, if (on) Tile.STATE_INACTIVE else Tile.STATE_ACTIVE)
      Api.event(server, request.first, request.second) { ok -> if (ok) refresh(server) else unreachable(server) }
    }
  }

  private fun refresh(server: Server) =
    Api.module(server, module) { data ->
      when (data?.let(::isOn)) {
        true -> show(server.name, Tile.STATE_ACTIVE)
        false -> show(server.name, Tile.STATE_INACTIVE)
        null -> if (data == null) unreachable(server) else unsupported(server)
      }
    }

  private fun unreachable(server: Server) =
    show(getString(R.string.tile_unreachable, server.name), Tile.STATE_UNAVAILABLE)

  private fun unsupported(server: Server) =
    show(getString(R.string.tile_unsupported, server.name), Tile.STATE_UNAVAILABLE)
}

/** Keeps the computer from going to sleep, until turned off. */
class KeepAwakeTileService : ToggleTileService("system") {
  override fun isOn(data: JSONObject): Boolean? = if (data.isNull("keep_awake")) null else data.optBoolean("keep_awake")

  override fun switchTo(data: JSONObject, on: Boolean) = "SYSTEM_SET_KEEP_AWAKE" to JSONObject().put("enabled", on)
}

/** Mutes the computer's default output. */
class MuteTileService : ToggleTileService("audio") {
  private fun output(data: JSONObject): JSONObject? {
    val outputs = data.optJSONArray("outputs") ?: return null

    return (0 until outputs.length()).map(outputs::getJSONObject).firstOrNull { output -> output.optBoolean("default") }
  }

  override fun isOn(data: JSONObject): Boolean? =
    output(data)?.takeUnless { output -> output.isNull("muted") }?.optBoolean("muted")

  override fun switchTo(data: JSONObject, on: Boolean) =
    output(data)?.let { output -> "AUDIO_CONTROL" to JSONObject().put("id", output.getString("id")).put("muted", on) }
}

/** Plays or pauses the computer's player, on while it plays. */
class PlayPauseTileService : ToggleTileService("media") {
  override fun isOn(data: JSONObject): Boolean = !data.isNull("status") && data.optString("status") == "PLAYING"

  override fun switchTo(data: JSONObject, on: Boolean) =
    "MEDIA_CONTROL" to JSONObject().put("action", if (on) "PLAY" else "PAUSE")
}
