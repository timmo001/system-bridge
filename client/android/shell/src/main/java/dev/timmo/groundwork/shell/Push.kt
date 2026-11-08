/**
 * Pushes through UnifiedPush, with the embedded FCM distributor where the
 * phone has no distributor. The shell registers one instance per service,
 * then posts the endpoint and its keys to the service's `push/subscriptions`
 * as the push contract describes, and shows each `PushPayload` it receives.
 */
package dev.timmo.groundwork.shell

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import org.json.JSONObject
import org.unifiedpush.android.connector.FailedReason
import org.unifiedpush.android.connector.PushService
import org.unifiedpush.android.connector.UnifiedPush
import org.unifiedpush.android.connector.data.PushEndpoint
import org.unifiedpush.android.connector.data.PushMessage

object Push {
  private const val PREFS = "groundwork.push"
  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val waiting = ConcurrentHashMap<String, (String) -> Unit>()

  /**
   * Subscribes to a service's pushes with `{ service, client, headers }`, the
   * view's `MobilePushOptions`, and calls `done` with the push state once the
   * service has the endpoint.
   */
  fun subscribe(activity: Activity, params: JSONObject, done: (String) -> Unit) {
    val service = params.getString("service")
    val headers = params.optJSONObject("headers") ?: JSONObject()

    io.execute {
      val key =
        runCatching {
            val (status, body) = request("GET", resolve(service, "push/vapid-key"), headers, null)
            if (status in 200..299) JSONObject(body).getString("publicKey") else null
          }
          .getOrNull()

      main.post {
        if (key == null) return@post done("default")

        prefs(activity).edit().putString(service, params.toString()).apply()
        waiting[service] = done
        UnifiedPush.tryUseCurrentOrDefaultDistributor(activity) { found ->
          // No distributor app on the phone: use the one embedded in the app
          if (!found) UnifiedPush.saveDistributor(activity, activity.packageName)
          UnifiedPush.register(
            activity,
            service,
            params.optJSONObject("client")?.optString("name"),
            key,
          )
        }
      }
    }
  }

  /** Stops a service's pushes, here and at the service. */
  fun unsubscribe(context: Context, params: JSONObject, done: () -> Unit) {
    val service = params.getString("service")
    val saved = saved(context, service)

    UnifiedPush.unregister(context, service)
    prefs(context).edit().remove(service).apply()
    io.execute {
      saved?.optString("endpoint")?.ifEmpty { null }?.let { endpoint -> forget(service, saved, endpoint) }
      main.post(done)
    }
  }

  /** `subscribed` when any service has the endpoint, as the view's `pushState`. */
  fun state(context: Context): String =
    if (prefs(context).all.values.any { (it as? String)?.let(::JSONObject)?.has("endpoint") == true })
      "subscribed"
    else "default"

  internal fun onEndpoint(context: Context, service: String, endpoint: PushEndpoint) {
    val saved = saved(context, service) ?: return
    val keys = endpoint.pubKeySet ?: return finish(service, "default")
    val subscription =
      JSONObject()
        .put("endpoint", endpoint.url)
        .put("keys", JSONObject().put("p256dh", keys.pubKey).put("auth", keys.auth))
        .put("client", saved.optJSONObject("client") ?: JSONObject())

    io.execute {
      val (status, _) =
        runCatching {
            request(
              "POST",
              resolve(service, "push/subscriptions"),
              saved.optJSONObject("headers") ?: JSONObject(),
              subscription.toString(),
            )
          }
          .getOrDefault(0 to "")
      val ok = status in 200..299

      if (ok) prefs(context).edit().putString(service, saved.put("endpoint", endpoint.url).toString()).apply()
      finish(service, if (ok) "subscribed" else "default")
    }
  }

  internal fun onFailed(service: String) = finish(service, "default")

  internal fun onUnregistered(context: Context, service: String) {
    val saved = saved(context, service) ?: return

    prefs(context).edit().remove(service).apply()
    io.execute { saved.optString("endpoint").ifEmpty { null }?.let { forget(service, saved, it) } }
  }

  private fun finish(service: String, state: String) {
    val done = waiting.remove(service) ?: return

    main.post { done(state) }
  }

  private fun forget(service: String, saved: JSONObject, endpoint: String) {
    runCatching {
      request(
        "DELETE",
        resolve(service, "push/subscriptions"),
        saved.optJSONObject("headers") ?: JSONObject(),
        JSONObject().put("endpoint", endpoint).toString(),
      )
    }
  }

  private fun saved(context: Context, service: String): JSONObject? =
    prefs(context).getString(service, null)?.let(::JSONObject)

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun resolve(service: String, route: String) = URL(URL(service), route)

  private fun request(method: String, url: URL, headers: JSONObject, body: String?): Pair<Int, String> {
    val connection = url.openConnection() as HttpURLConnection

    try {
      connection.requestMethod = method
      connection.connectTimeout = 15_000
      connection.readTimeout = 15_000
      headers.keys().forEach { connection.setRequestProperty(it, headers.getString(it)) }

      if (body != null) {
        connection.doOutput = true
        connection.setRequestProperty("content-type", "application/json")
        connection.outputStream.use { it.write(body.toByteArray()) }
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

/**
 * Receives UnifiedPush's endpoints and messages. Each message is a
 * `PushPayload`, shown as a notification or a Live Update.
 */
open class ShellPushService : PushService() {
  override fun onNewEndpoint(endpoint: PushEndpoint, instance: String) =
    Push.onEndpoint(this, instance, endpoint)

  override fun onMessage(message: PushMessage, instance: String) {
    if (!message.decrypted) return

    val payload = runCatching { JSONObject(message.content.decodeToString()) }.getOrNull() ?: return

    Notifications(this, ShellConfig.load(this)).showPush(payload)
  }

  override fun onRegistrationFailed(reason: FailedReason, instance: String) = Push.onFailed(instance)

  override fun onUnregistered(instance: String) = Push.onUnregistered(this, instance)
}
