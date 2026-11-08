/**
 * The bridge between the shell and its view: the `groundworkShell` object
 * injected into allowed pages, and the JSON `request`, `reply` and `message`
 * shapes `@timmo001/groundwork-mobile/bridge` reads. The shell's handlers and
 * the app's own are registered here by name.
 */
package dev.timmo.groundwork.shell

import android.net.Uri
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/** A request from the view: its name and its JSON params, or `null`. */
class BridgeRequest(val name: String, val params: Any?, val origin: Uri) {
  /** The params as an object, or an empty one when they aren't. */
  val paramsObject: JSONObject
    get() = params as? JSONObject ?: JSONObject()
}

/** Answers one request, once. */
class BridgeReply internal constructor(private val id: Long, private val post: (String) -> Unit) {
  private var sent = false

  fun ok(value: Any? = null) = send(JSONObject().put("ok", true).put("value", value ?: JSONObject.NULL))

  fun error(message: String) = send(JSONObject().put("ok", false).put("error", message))

  private fun send(reply: JSONObject) {
    if (sent) return
    sent = true
    post(reply.put("type", "reply").put("id", id).toString())
  }
}

/** Answers a request, now or later, through `reply`. */
fun interface BridgeHandler {
  fun handle(request: BridgeRequest, reply: BridgeReply)
}

class Bridge internal constructor(private val allowedOrigins: () -> Set<String>) {
  private val handlers = mutableMapOf<String, BridgeHandler>()
  private val queued = mutableListOf<String>()
  private var proxy: JavaScriptReplyProxy? = null

  /** Adds a handler, or replaces the shell's own under the same name. */
  fun handle(name: String, handler: BridgeHandler) {
    handlers[name] = handler
  }

  /** Removes a handler, so the view's request for it fails. */
  fun remove(name: String) {
    handlers.remove(name)
  }

  /**
   * Sends a message to the view, held until the page has connected. `data`
   * is a JSONObject, JSONArray, string, number, boolean or `null`.
   */
  fun send(name: String, data: Any? = null) {
    val text =
      JSONObject()
        .put("type", "message")
        .put("name", name)
        .put("data", data ?: JSONObject.NULL)
        .toString()
    val current = proxy

    if (current == null) queued += text else current.postMessage(text)
  }

  internal fun attach(webView: WebView) {
    check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      "This WebView has no web message listener; update Android System WebView"
    }

    WebViewCompat.addWebMessageListener(webView, OBJECT_NAME, allowedOrigins()) {
      _,
      message,
      origin,
      isMainFrame,
      replyProxy ->
      if (isMainFrame) receive(message, origin, replyProxy)
    }
  }

  /**
   * Injects the object again with the current allowed origins, which the
   * WebView only reads when it's added. Takes effect from the next page load.
   */
  internal fun reattach(webView: WebView) {
    WebViewCompat.removeWebMessageListener(webView, OBJECT_NAME)
    detach()
    attach(webView)
  }

  /** A new page loaded: messages wait for it to connect again. */
  internal fun detach() {
    proxy = null
  }

  private fun receive(message: WebMessageCompat, origin: Uri, replyProxy: JavaScriptReplyProxy) {
    proxy = replyProxy
    queued.forEach(replyProxy::postMessage)
    queued.clear()

    val json = runCatching { JSONObject(message.data ?: return) }.getOrNull() ?: return

    if (json.optString("type") != "request") return

    val id = json.optLong("id")
    val name = json.optString("name")
    val reply = BridgeReply(id) { replyProxy.postMessage(it) }
    val handler = handlers[name] ?: return reply.error("The shell has no request named $name")
    val params = json.opt("params")?.takeUnless { it == JSONObject.NULL }

    runCatching { handler.handle(BridgeRequest(name, params, origin), reply) }
      .onFailure { reply.error(it.message ?: it.javaClass.simpleName) }
  }

  companion object {
    /** The object's name in the page, `bridgeObjectName` in the view package. */
    const val OBJECT_NAME = "groundworkShell"
  }
}
