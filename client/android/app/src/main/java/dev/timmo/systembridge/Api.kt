/**
 * The few calls the app makes to a computer itself, rather than through its
 * page: pairing, checking a computer added by hand, and the tiles' events.
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
import java.util.concurrent.Executors
import org.json.JSONObject

object Api {
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

  /** Runs one event on a computer, such as POWER_LOCK, saying whether it did. */
  fun event(server: Server, name: String, done: (Boolean) -> Unit) =
    run<Boolean>({ done(it.getOrDefault(false)) }) {
      val (status, body) =
        request("POST", "${server.url}api/event", server.token, JSONObject().put("event", name).put("data", JSONObject()))

      status == 200 && JSONObject(body).optString("type") != "ERROR"
    }

  private fun <T> run(done: (Result<T>) -> Unit, work: () -> T) {
    io.execute {
      val result = runCatching(work)

      main.post { done(result) }
    }
  }

  private fun request(method: String, url: String, token: String?, body: JSONObject?): Pair<Int, String> {
    val connection = URL(url).openConnection() as HttpURLConnection

    try {
      connection.requestMethod = method
      connection.connectTimeout = 15_000
      connection.readTimeout = 15_000
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
