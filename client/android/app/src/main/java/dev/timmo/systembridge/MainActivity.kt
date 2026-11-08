/**
 * System Bridge's activity: the shell, opening the paired computer's own web
 * client, or the bundled pairing page when there's none yet. The app's own
 * requests pair, add, switch and forget computers, for the pairing page and
 * the web client's computer menu.
 */
package dev.timmo.systembridge

import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebResourceErrorCompat
import dev.timmo.groundwork.shell.Bridge
import dev.timmo.groundwork.shell.BridgeReply
import dev.timmo.groundwork.shell.ShellActivity
import org.json.JSONObject

class MainActivity : ShellActivity() {
  /** The pairing page: the bundled one, or its dev server in debug builds. */
  private val pairingUrl: String
    get() = super.startUrl

  /**
   * The current computer's web client, with the token it reads and then takes
   * off the address. Android 17 blocks the local network until it's allowed,
   * so until then the pairing page opens and asks.
   */
  override val startUrl: String
    get() =
      Servers.current(this)
        ?.takeIf { localNetworkAllowed() }
        ?.let { "${it.url}?token=${Uri.encode(it.token)}" }
        ?: pairingUrl

  private fun localNetworkAllowed() =
    Build.VERSION.SDK_INT < LOCAL_NETWORK_SDK ||
      checkSelfPermission(ACCESS_LOCAL_NETWORK) == PackageManager.PERMISSION_GRANTED

  override fun allowedOrigins(): Set<String> =
    super.allowedOrigins() + Servers.originOf(pairingUrl) + Servers.all(this).map { it.origin }

  private var refresh: SwipeRefreshLayout? = null

  /**
   * Swipe down at the top of a page to reload it. On the offline page it
   * tries the computer again instead.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val frame = webView.parent as ViewGroup

    frame.removeView(webView)
    refresh =
      SwipeRefreshLayout(this).apply {
        addView(webView)
        setOnChildScrollUpCallback { _, _ -> webView.canScrollVertically(-1) }
        setOnRefreshListener {
          val unreachable = webView.url?.let { Uri.parse(it).getQueryParameter("unreachable") }

          if (unreachable != null) webView.loadUrl(startUrl) else webView.reload()
        }
        // The page draws under the status bar, so the spinner starts below it
        ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
          val top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top
          val reach = (64 * resources.displayMetrics.density).toInt()

          setProgressViewOffset(false, top, top + reach)
          insets
        }
      }
    frame.addView(refresh, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }

  /**
   * When a paired computer's page can't load, such as with the computer
   * asleep, gone from the network or at a new address, the bundled page
   * opens instead and says so, rather than the WebView's error page. It
   * looks for the computer on the network and offers the others.
   */
  override fun createWebView(): WebView =
    super.createWebView().apply {
      webViewClient =
        object : ShellWebViewClient() {
          override fun onPageFinished(view: WebView, url: String?) {
            super.onPageFinished(view, url)
            refresh?.isRefreshing = false
          }

          override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceErrorCompat) {
            super.onReceivedError(view, request, error)

            if (!request.isForMainFrame) return

            val server = Servers.at(this@MainActivity, request.url.toString()) ?: return

            view.post { view.loadUrl("$pairingUrl?unreachable=${Uri.encode(server.id)}") }
          }
        }
    }

  override fun onBridgeReady(bridge: Bridge) {
    bridge.handle("servers") { _, reply -> reply.ok(Servers.json(this)) }

    // This install, the same client pairing names, for the push contract: the
    // page can't read the phone's model, and has an id for each origin
    bridge.handle("client") { _, reply -> reply.ok(Servers.client(this)) }

    bridge.handle("pair") { request, reply ->
      Api.pair(request.paramsObject.getString("link"), Servers.client(this)) { opened(it, reply) }
    }

    bridge.handle("addServer") { request, reply ->
      val params = request.paramsObject

      Api.check(params.getString("url"), params.getString("token")) { opened(it, reply) }
    }

    bridge.handle("selectServer") { request, reply ->
      val selected = Servers.select(this, request.paramsObject.getString("id"))

      reply.ok(selected)
      if (selected) refreshOrigins()
    }

    // A paired computer found at a new address, by the uuid it advertises.
    // Its name comes first, as that survives the next move; the first that
    // answers is kept
    bridge.handle("updateServer") { request, reply ->
      val params = request.paramsObject
      val urls = params.optJSONArray("urls")?.let { list -> List(list.length()) { list.getString(it) } }.orEmpty()

      Api.firstReachable(urls) { url ->
        val moved = url?.let { Servers.move(this, params.getString("id"), it) }

        reply.ok(moved?.url)
        if (moved != null) refreshOrigins()
      }
    }

    bridge.handle("removeServer") { request, reply ->
      Servers.remove(this, request.paramsObject.getString("id"))
      reply.ok(true)
      // Stays on the page it's on, with the forgotten origin dropped
      refreshOrigins(webView.url ?: pairingUrl)
    }

    bridge.handle("showPairing") { _, reply ->
      reply.ok(true)
      webView.loadUrl(pairingUrl)
    }
  }

  /** Keeps a computer paired or added by hand, answers, then opens it. */
  private fun opened(result: Result<Server>, reply: BridgeReply) {
    result.fold(
      { server ->
        Servers.save(this, server)
        reply.ok(JSONObject().put("id", server.id).put("name", server.name))
        refreshOrigins()
      },
      { reply.error(it.message ?: "Couldn't reach the computer") },
    )
  }

  companion object {
    /** Android 17, which gates the local network for apps that target it. */
    private const val LOCAL_NETWORK_SDK = 37
  }
}
