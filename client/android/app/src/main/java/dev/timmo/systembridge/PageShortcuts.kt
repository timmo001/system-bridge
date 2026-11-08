/**
 * Launcher shortcuts to the computers' pages: the pages used most, learned
 * from the visits the web client passes on, with a starting set until there
 * are enough, and any page pinned to the home screen. Each opens
 * `systembridge://computer/<uuid>/<path>`, which `MainActivity.deepLinkUrl`
 * maps to the computer's address at the time, so a computer that moved still
 * opens.
 */
package dev.timmo.systembridge

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.pow

object PageShortcuts {
  private const val PREFS = "systembridge.shortcuts"
  private const val VISITS = "visits"
  private const val DEFAULTS = "defaults"
  private const val PUBLISHED = "published"

  /** How many most launchers show on a long press. */
  private const val SHOWN = 4

  /** How many visited pages are kept, the most used first. */
  private const val KEPT = 50

  /** A visit counts half as much after two weeks. */
  private const val HALF_LIFE_MS = 14L * 24 * 60 * 60 * 1000

  /** A page on a computer, how much it's used and when it was last. */
  private data class Visit(
    val server: String,
    val path: String,
    val label: String,
    val icon: String,
    val score: Double,
    val at: Long,
  ) {
    fun scoreAt(now: Long): Double = score * 0.5.pow((now - at).toDouble() / HALF_LIFE_MS)

    fun json(): JSONObject =
      JSONObject()
        .put("server", server)
        .put("path", path)
        .put("label", label)
        .put("icon", icon)
        .put("score", score)
        .put("at", at)
  }

  /** The link a shortcut opens: a page on a computer, by its uuid. */
  fun link(serverId: String, path: String): String = "systembridge://computer/$serverId/${path.trimStart('/')}"

  /**
   * Counts a visit to `page`, a `{ path, label, icon }`, on `server`, keeps
   * `defaults` as the starting set, and publishes the shortcuts again.
   */
  fun visit(activity: MainActivity, server: Server, page: JSONObject, defaults: JSONArray) {
    val now = System.currentTimeMillis()
    val path = page.getString("path")
    val visits = visits(activity)
    val before = visits.find { visit -> visit.server == server.id && visit.path == path }
    val visited =
      Visit(
        server.id,
        path,
        page.getString("label"),
        page.optString("icon"),
        (before?.scoreAt(now) ?: 0.0) + 1,
        now,
      )
    val kept =
      (visits.filter { visit -> visit !== before } + visited)
        .sortedByDescending { visit -> visit.scoreAt(now) }
        .take(KEPT)

    prefs(activity)
      .edit()
      .putString(VISITS, JSONArray(kept.map { visit -> visit.json() }).toString())
      .putString(DEFAULTS, defaults.toString())
      .apply()
    publish(activity)
  }

  /** Asks the launcher to pin `page` on `server` to the home screen. */
  fun pin(activity: MainActivity, server: Server, page: JSONObject): Boolean {
    val visit = Visit(server.id, page.getString("path"), page.getString("label"), page.optString("icon"), 0.0, 0)

    return activity.shortcuts.pin(shortcut(visit, server.name, Servers.all(activity).size > 1))
  }

  /**
   * Forgets a removed computer's pages: its long-press shortcuts go, and any
   * pinned ones are greyed out.
   */
  fun forget(activity: MainActivity, serverId: String) {
    val ids = activity.shortcuts.ids().filter { id -> id.startsWith("page:$serverId:") }

    if (ids.isNotEmpty()) activity.shortcuts.disable(ids, activity.getString(R.string.shortcut_removed))
    prefs(activity)
      .edit()
      .putString(VISITS, JSONArray(visits(activity).filter { visit -> visit.server != serverId }.map { visit -> visit.json() }).toString())
      .apply()
    publish(activity)
  }

  /**
   * Publishes the pages used most across the paired computers, filled up
   * with the starting set on the current one, when they changed. With more
   * than one computer, each names its computer.
   */
  fun publish(activity: MainActivity) {
    val servers = Servers.all(activity)
    val names = servers.associate { server -> server.id to server.name }
    val now = System.currentTimeMillis()
    val current = Servers.current(activity)
    val ranked = visits(activity).filter { visit -> visit.server in names }.sortedByDescending { visit -> visit.scoreAt(now) }
    val defaults = JSONArray(prefs(activity).getString(DEFAULTS, "[]"))
    val starting =
      if (current == null) emptyList()
      else (0 until defaults.length()).map { index ->
        val page = defaults.getJSONObject(index)

        Visit(current.id, page.getString("path"), page.getString("label"), page.optString("icon"), 0.0, 0)
      }
    val pages = (ranked + starting).distinctBy { visit -> visit.server to visit.path }.take(SHOWN)
    val list = JSONArray(pages.map { visit -> shortcut(visit, names[visit.server].orEmpty(), servers.size > 1) })
    val text = list.toString()

    if (prefs(activity).getString(PUBLISHED, null) == text) return

    activity.shortcuts.set(list)
    prefs(activity).edit().putString(PUBLISHED, text).apply()
  }

  private fun shortcut(visit: Visit, serverName: String, named: Boolean): JSONObject {
    val shortcut =
      JSONObject()
        .put("id", "page:${visit.server}:${visit.path}")
        .put("label", visit.label)
        .put("longLabel", if (named) "$serverName: ${visit.label}" else visit.label)
        .put("url", link(visit.server, visit.path))

    if (visit.icon.isNotBlank()) shortcut.put("icon", visit.icon)

    return shortcut
  }

  private fun visits(context: Context): List<Visit> {
    val list = JSONArray(prefs(context).getString(VISITS, "[]"))

    return (0 until list.length()).map { index ->
      val visit = list.getJSONObject(index)

      Visit(
        visit.getString("server"),
        visit.getString("path"),
        visit.getString("label"),
        visit.optString("icon"),
        visit.getDouble("score"),
        visit.getLong("at"),
      )
    }
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
