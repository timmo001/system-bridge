/**
 * mDNS service discovery for the `discoverServices` request, through
 * NsdManager. From Android 17 an app targeting it needs ACCESS_LOCAL_NETWORK
 * to browse the network; without it the system's picker lets the person
 * choose one service, which grants the app that device alone.
 */
package dev.timmo.groundwork.shell

import android.content.Context
import android.net.nsd.DiscoveryRequest
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.net.Inet4Address
import java.net.Inet6Address
import org.json.JSONArray
import org.json.JSONObject

class ServiceDiscovery(private val context: Context) {
  private val nsd = context.getSystemService(NsdManager::class.java)
  private val main = context.mainExecutor
  private val handler = Handler(Looper.getMainLooper())

  /** True on Android 17 and up when the app targets it, where browsing needs the permission. */
  val localNetworkGated: Boolean
    get() = Build.VERSION.SDK_INT >= ANDROID_17 && context.applicationInfo.targetSdkVersion >= ANDROID_17

  /**
   * Finds services of `type`, such as `_http._tcp`. With `picker` the system
   * asks the person to choose one, and the list holds it alone or nothing;
   * otherwise it browses for `timeoutMs` and lists every service it resolved.
   */
  fun discover(type: String, picker: Boolean, timeoutMs: Long, done: (Result<JSONArray>) -> Unit) {
    if (picker && localNetworkGated) pick(type, done) else browse(type, timeoutMs, done)
  }

  private fun pick(type: String, done: (Result<JSONArray>) -> Unit) {
    if (Build.VERSION.SDK_INT < ANDROID_17) return browse(type, DEFAULT_TIMEOUT_MS, done)

    val request = DiscoveryRequest.Builder(type).setFlags(DiscoveryRequest.FLAG_SHOW_PICKER).build()
    var finished = false

    lateinit var callback: NsdManager.ServiceInfoCallback

    fun finish(result: Result<JSONArray>) {
      if (finished) return
      finished = true
      runCatching { nsd.unregisterServiceInfoCallback(callback) }
      done(result)
    }

    callback =
      object : NsdManager.ServiceInfoCallback {
        override fun onServiceUpdated(info: NsdServiceInfo) = finish(Result.success(JSONArray().put(describe(info))))

        override fun onServiceLost() = finish(Result.success(JSONArray()))

        override fun onServiceInfoCallbackRegistrationFailed(errorCode: Int) =
          finish(if (errorCode == NsdManager.FAILURE_PERMISSION_DENIED) Result.success(JSONArray()) else failure(errorCode))

        override fun onServiceInfoCallbackUnregistered() = Unit
      }

    nsd.registerServiceInfoCallback(request, main, callback)
  }

  private fun browse(type: String, timeoutMs: Long, done: (Result<JSONArray>) -> Unit) {
    val found = linkedMapOf<String, JSONObject>()
    val resolving = mutableListOf<NsdManager.ServiceInfoCallback>()
    var finished = false

    lateinit var listener: NsdManager.DiscoveryListener

    fun finish(result: Result<JSONArray>) {
      if (finished) return
      finished = true
      runCatching { nsd.stopServiceDiscovery(listener) }
      resolving.forEach { runCatching { nsd.unregisterServiceInfoCallback(it) } }
      done(result)
    }

    listener =
      object : NsdManager.DiscoveryListener {
        override fun onServiceFound(info: NsdServiceInfo) {
          val callback =
            object : NsdManager.ServiceInfoCallback {
              override fun onServiceUpdated(resolved: NsdServiceInfo) {
                found[resolved.serviceName] = describe(resolved)
              }

              override fun onServiceLost() {
                found.remove(info.serviceName)
              }

              override fun onServiceInfoCallbackRegistrationFailed(errorCode: Int) = Unit

              override fun onServiceInfoCallbackUnregistered() = Unit
            }

          resolving += callback
          runCatching { nsd.registerServiceInfoCallback(info, main, callback) }
        }

        override fun onServiceLost(info: NsdServiceInfo) {
          found.remove(info.serviceName)
        }

        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) = finish(failure(errorCode))

        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit

        override fun onDiscoveryStarted(serviceType: String) = Unit

        override fun onDiscoveryStopped(serviceType: String) = Unit
      }

    nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, null as android.net.Network?, main, listener)
    handler.postDelayed({ finish(Result.success(JSONArray(found.values))) }, timeoutMs)
  }

  private fun describe(info: NsdServiceInfo): JSONObject {
    val addresses = info.hostAddresses
    val preferred = addresses.firstOrNull { it is Inet4Address } ?: addresses.firstOrNull()
    val txt = JSONObject()

    info.attributes.forEach { (key, value) -> txt.put(key, value?.toString(Charsets.UTF_8) ?: JSONObject.NULL) }

    return JSONObject()
      .put("name", info.serviceName)
      .put("type", info.serviceType.trim('.'))
      .put("hostname", if (Build.VERSION.SDK_INT >= ANDROID_17) info.hostname ?: JSONObject.NULL else JSONObject.NULL)
      .put("host", preferred?.let(::urlHost) ?: JSONObject.NULL)
      .put("addresses", JSONArray(addresses.mapNotNull { it.hostAddress }))
      .put("port", info.port)
      .put("txt", txt)
  }

  /** The address as a URL's host: IPv6 in brackets, without its scope. */
  private fun urlHost(address: java.net.InetAddress): String? {
    val text = address.hostAddress ?: return null

    return if (address is Inet6Address) "[${text.substringBefore('%')}]" else text
  }

  private fun failure(errorCode: Int): Result<JSONArray> =
    Result.failure(
      IllegalStateException(
        when (errorCode) {
          NsdManager.FAILURE_PERMISSION_DENIED -> "The app has no local network permission"
          NsdManager.FAILURE_BAD_PARAMETERS -> "The service type isn't valid"
          NsdManager.FAILURE_MAX_LIMIT -> "Too many discoveries are running"
          else -> "Discovery failed ($errorCode)"
        }
      )
    )

  companion object {
    const val DEFAULT_TIMEOUT_MS = 3000L

    /** Android 17, CINNAMON_BUN. */
    const val ANDROID_17 = 37
  }
}
