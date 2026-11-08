/**
 * The computers this phone has paired with, and which one is open, kept in
 * the app's preferences. Each keeps the API token it was given, which only
 * Kotlin reads: the pages get the list without tokens, as any paired
 * computer's page can ask for it.
 */
package dev.timmo.systembridge

import android.content.Context
import android.net.Uri
import dev.timmo.groundwork.shell.Push
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

/** A paired computer: its System Bridge uuid, hostname, base URL and token. */
data class Server(val id: String, val name: String, val url: String, val token: String) {
  /** Its origin, such as http://192.168.1.5:9170, which the WebView allows. */
  val origin: String
    get() = Servers.originOf(url)

  /** Where its push routes are, as the push contract's service URL. */
  val pushService: String
    get() = "${url}api/"
}

object Servers {
  private const val PREFS = "systembridge.servers"
  private const val LIST = "servers"
  private const val CURRENT = "current"
  private const val CLIENT_ID = "clientId"

  fun all(context: Context): List<Server> {
    val list = JSONArray(prefs(context).getString(LIST, "[]"))

    return (0 until list.length()).map { index ->
      list.getJSONObject(index).let {
        Server(it.getString("id"), it.getString("name"), it.getString("url"), it.getString("token"))
      }
    }
  }

  /** The computer the app opens, or the first paired when none is picked. */
  fun current(context: Context): Server? {
    val servers = all(context)
    val id = prefs(context).getString(CURRENT, null)

    return servers.find { it.id == id } ?: servers.firstOrNull()
  }

  /** Keeps a computer, replacing one with the same id, and makes it current. */
  fun save(context: Context, server: Server) {
    write(context, all(context).filter { it.id != server.id } + server, server.id)
  }

  /** Changes a paired computer in its place, keeping which one is current. */
  fun update(context: Context, server: Server) {
    write(context, all(context).map { if (it.id == server.id) server else it }, current(context)?.id)
  }

  /** Moves a paired computer to a new address, such as after its IP changed. */
  fun move(context: Context, id: String, url: String): Server? {
    val moved = all(context).find { it.id == id }?.copy(url = baseUrl(url)) ?: return null

    save(context, moved)
    return moved
  }

  /** The paired computer a URL is on, if any. */
  fun at(context: Context, url: String): Server? = all(context).find { it.origin == originOf(url) }

  /** Makes a paired computer current, saying whether it's paired. */
  fun select(context: Context, id: String): Boolean {
    if (all(context).none { it.id == id }) return false

    prefs(context).edit().putString(CURRENT, id).apply()
    return true
  }

  /** Forgets a computer and stops its pushes to this phone. */
  fun remove(context: Context, id: String) {
    val servers = all(context)

    servers.find { it.id == id }?.let { removed ->
      Push.unsubscribe(context, JSONObject().put("service", removed.pushService)) {}
    }
    write(context, servers.filter { it.id != id }, current(context)?.id?.takeIf { it != id })
  }

  /** The list for the pages: never the tokens. */
  fun json(context: Context): JSONArray {
    val current = current(context)?.id

    return JSONArray(
      all(context).map {
        JSONObject().put("id", it.id).put("name", it.name).put("url", it.url).put("current", it.id == current)
      }
    )
  }

  /** This install, as the push contract and pairing name a client. */
  fun client(context: Context): JSONObject {
    val prefs = prefs(context)
    val id = prefs.getString(CLIENT_ID, null) ?: UUID.randomUUID().toString().also {
      prefs.edit().putString(CLIENT_ID, it).apply()
    }

    return JSONObject().put("id", id).put("name", android.os.Build.MODEL).put("platform", "android")
  }

  /** A computer's base URL, such as http://192.168.1.5:9170/, from any of its URLs. */
  fun baseUrl(url: String): String = "${originOf(url)}/"

  fun originOf(url: String): String =
    Uri.parse(url).let { uri ->
      val port = if (uri.port == -1) "" else ":${uri.port}"
      "${uri.scheme}://${uri.host}$port"
    }

  private fun write(context: Context, servers: List<Server>, current: String?) {
    val list =
      JSONArray(
        servers.map {
          JSONObject().put("id", it.id).put("name", it.name).put("url", it.url).put("token", it.token)
        }
      )

    prefs(context).edit().putString(LIST, list.toString()).putString(CURRENT, current).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
