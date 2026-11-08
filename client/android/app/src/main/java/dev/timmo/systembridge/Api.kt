/**
 * The few calls the app makes to a computer itself, rather than through its
 * page: pairing, checking a computer added by hand, finding the one in use
 * for a share, and the tiles' events.
 * The pairing page can't make them, as it's served over HTTPS and can't
 * fetch a computer's plain HTTP address. Each runs off the main thread and
 * answers on it.
 */
package dev.timmo.systembridge

import android.net.Uri
import android.os.Handler
import android.os.Looper
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import org.json.JSONObject

object Api {
  /** How long a share waits on each computer to say whether it's in use. */
  private const val IN_USE_TIMEOUT_MS = 3_000

  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())

  /**
   * Trades a pairing link's one-time code, from the QR code, for the
   * computer's API token. The link names the computer, such as desk.local,
   * and may carry its address in `ip` for a network where the name doesn't
   * resolve; the first that answers is kept.
   */
  fun pair(link: String, client: JSONObject, done: (Result<Server>) -> Unit) =
    run(done) {
      val uri = Uri.parse(link)
      val code = uri.getQueryParameter("pair")?.ifBlank { null } ?: error("That isn't a System Bridge pairing code")
      val body = JSONObject().put("code", code).put("client", client)
      val candidates =
        listOfNotNull(
          Servers.baseUrl(link),
          uri.getQueryParameter("ip")?.ifBlank { null }?.let { ip ->
            val host = if (ip.contains(':')) "[$ip]" else ip
            val port = if (uri.port == -1) "" else ":${uri.port}"
            "${uri.scheme}://$host$port/"
          },
        )
      var unreachable: Exception? = null
      val (url, status, answer) =
        candidates.firstNotNullOfOrNull { candidate ->
          try {
            request("POST", "${candidate}api/pair", null, body).let { (status, text) -> Triple(candidate, status, text) }
          } catch (error: java.io.IOException) {
            unreachable = error
            null
          }
        } ?: throw unreachable ?: error("Couldn't reach the computer")

      when (status) {
        200 -> JSONObject(answer).let {
          val service = it.getJSONObject("service")
          Server(service.getString("id"), service.getString("name"), url, it.getString("token"))
        }
        401 -> error("That code has been used or has expired. Make a new one on the computer.")
        else -> error("The computer answered $status")
      }
    }

  /** Checks a computer added by hand, and names it from its system data. */
  fun check(url: String, token: String, done: (Result<Server>) -> Unit) =
    run(done) {
      val base = Servers.baseUrl(url)
      val (status, body) = request("GET", "${base}api/data/system", token, null)

      when (status) {
        200 -> JSONObject(body).let {
          Server(
            it.optString("uuid").ifBlank { base },
            it.optString("hostname").ifBlank { Uri.parse(base).host ?: base },
            base,
            token,
          )
        }
        401 -> error("That API token isn't right")
        else -> error("The computer answered $status")
      }
    }

  /** The first of a computer's URLs whose System Bridge answers, if any. */
  fun firstReachable(urls: List<String>, done: (String?) -> Unit) =
    run<String?>({ done(it.getOrNull()) }) {
      urls.firstOrNull { url ->
        runCatching { request("GET", "${Servers.baseUrl(url)}api/health", null, null).first == 200 }.getOrDefault(false)
      }
    }

  /**
   * The paired computer in use: of those that answer within a few seconds,
   * the one whose person was idle the least, from its system data. One that
   * answers without an idle time comes after those with one. Null when none
   * answers.
   */
  fun inUse(servers: List<Server>, done: (Server?) -> Unit) =
    run<Server?>({ done(it.getOrNull()) }) {
      val pool = Executors.newFixedThreadPool(servers.size.coerceAtLeast(1))

      try {
        pool
          .invokeAll(servers.map { server -> Callable { server to idleTime(server) } })
          .mapNotNull { future -> runCatching { future.get() }.getOrNull() }
          .filter { (_, idle) -> idle != null }
          .minByOrNull { (_, idle) -> idle ?: Long.MAX_VALUE }
          ?.first
      } finally {
        pool.shutdown()
      }
    }

  /** Seconds since a computer's person last did anything, or null when it doesn't answer. */
  private fun idleTime(server: Server): Long? {
    val (status, body) = request("GET", "${server.url}api/data/system", server.token, null, IN_USE_TIMEOUT_MS)

    if (status != 200) return null

    val system = JSONObject(body)

    return if (system.isNull("idle_time")) Long.MAX_VALUE else system.optLong("idle_time")
  }

  /** Runs one event on a computer, such as POWER_LOCK, saying whether it did. */
  fun event(server: Server, name: String, data: JSONObject = JSONObject(), done: (Boolean) -> Unit) =
    run<Boolean>({ done(it.getOrDefault(false)) }) {
      val (status, body) =
        request("POST", "${server.url}api/event", server.token, JSONObject().put("event", name).put("data", data))

      status == 200 && JSONObject(body).optString("type") != "ERROR"
    }

  private fun <T> run(done: (Result<T>) -> Unit, work: () -> T) {
    io.execute {
      val result = runCatching(work)

      main.post { done(result) }
    }
  }

  private fun request(
    method: String,
    url: String,
    token: String?,
    body: JSONObject?,
    timeoutMs: Int = 15_000,
  ): Pair<Int, String> {
    val connection = URL(url).openConnection() as HttpURLConnection

    try {
      connection.requestMethod = method
      connection.connectTimeout = timeoutMs
      connection.readTimeout = timeoutMs
      token?.let { connection.setRequestProperty("X-API-Token", it) }

      if (body != null) {
        connection.doOutput = true
        connection.setRequestProperty("content-type", "application/json")
        connection.outputStream.use { it.write(body.toString().toByteArray()) }
      }

      val status = connection.responseCode
      val text =
        (if (status < 400) connection.inputStream else connection.errorStream)
          ?.bufferedReader()
          ?.use { it.readText() } ?: ""

      return status to text
    } finally {
      connection.disconnect()
    }
  }
}
