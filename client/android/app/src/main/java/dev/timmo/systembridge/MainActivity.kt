/**
 * System Bridge's activity: the shell, opening the paired computer's own web
 * client, or the bundled computers page when there's none yet. The app's
 * own requests pair, add, switch, edit and forget computers, for that page,
 * which the web client's Computers button opens.
 */
package dev.timmo.systembridge

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.MotionEvent
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

  /**
   * A page shortcut's `systembridge://computer/<uuid>/<path>` opens that page
   * on the computer at its current address, and makes it the current one.
   * The token only goes along when the page isn't on that computer already.
   * Other links go to the shell, onto the bundled page.
   */
  override fun deepLinkUrl(intent: Intent?): String? {
    val data = intent?.data

    if (intent?.action != Intent.ACTION_VIEW || data?.scheme != "systembridge" || data.host != "computer") {
      return super.deepLinkUrl(intent)
    }

    val segments = data.pathSegments
    val server = Servers.all(this).find { server -> server.id == segments.firstOrNull() }

    if (server == null || !localNetworkAllowed()) return pairingUrl

    Servers.select(this, server.id)

    val onComputer = webView.url?.let(Servers::originOf) == server.origin
    val query = listOfNotNull(data.encodedQuery, "token=${Uri.encode(server.token)}".takeUnless { onComputer })

    return server.url + segments.drop(1).joinToString("/") + query.joinToString("&").let { text ->
      if (text.isEmpty()) "" else "?$text"
    }
  }

  private var refresh: SwipeRefreshLayout? = null

  /** A share for a computer whose page is loading, by its id, given to it once loaded. */
  private var heldShare: Pair<String, JSONObject>? = null

  /**
   * Sends each share to the right computer's page. One sent to a computer's
   * sharing shortcut goes to that computer. Otherwise, with more than one
   * paired, it goes to the one in use, by idle time, or the current one when
   * none answers; with one, straight to it.
   */
  override fun shareOf(intent: Intent?): JSONObject? {
    val share = super.shareOf(intent) ?: return null
    val servers = Servers.all(this)
    val target = servers.find { server -> share.optString("shortcutId") == AppShortcuts.SHARE_PREFIX + server.id }

    when {
      target != null -> shareWith(target, share)
      servers.size > 1 -> Api.inUse(servers) { inUse -> (inUse ?: Servers.current(this))?.let { server -> shareWith(server, share) } }
      else -> return share
    }

    return null
  }

  /**
   * Gives a share to a computer's page: now when it's open, otherwise once
   * that computer, made the current one, has loaded.
   */
  private fun shareWith(server: Server, share: JSONObject) {
    if (webView.url?.let(Servers::originOf) == server.origin) {
      bridge.send("share", share)
      return
    }

    Servers.select(this, server.id)
    heldShare = server.id to share
    webView.loadUrl(startUrl)
  }

  /**
   * Whether the page under the current touch is at its top, so a pull may
   * refresh, or `null` while the page is asked. The layout only follows a
   * pull it may start when the finger goes down, before the page answers,
   * so it may until then; it checks again on each move, so a "no" still
   * stops it long before the pull reaches a refresh.
   */
  private var pageAtTop: Boolean? = null

  /** Counts touches, so a late answer for an earlier one is ignored. */
  private var touches = 0

  /**
   * Whether a pull at a point may refresh the page: nothing under it is
   * scrolled down, and it's not in an open popover or dialog, such as the
   * page search. The web client scrolls inside its own elements, so the
   * WebView alone can't tell.
   */
  private val pageAtTopScript =
    """
    (x, y) => {
      let element = document.elementFromPoint(x, y);
      while (element?.shadowRoot?.elementFromPoint(x, y)) {
        const inner = element.shadowRoot.elementFromPoint(x, y);
        if (inner === element) break;
        element = inner;
      }
      for (let node = element; node; node = node.parentElement ?? node.getRootNode().host) {
        if (node.scrollTop > 0) return false;
        try {
          if (node.matches(":popover-open, dialog[open], [aria-modal=true]")) return false;
        } catch {}
      }
      return true;
    }
    """.trimIndent()

  /**
   * Swipe down at the top of a page to reload it, skipping the cache. On the
   * offline page it tries the computer again instead.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val frame = webView.parent as ViewGroup

    frame.removeView(webView)
    refresh =
      object : SwipeRefreshLayout(this) {
        // Each touch asks the page whether a pull there may refresh
        override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
          if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            val density = resources.displayMetrics.density
            val touch = ++touches

            pageAtTop = null
            webView.evaluateJavascript("($pageAtTopScript)(${event.x / density}, ${event.y / density})") {
              if (touch == touches) pageAtTop = it == "true"
            }
          }

          return super.onInterceptTouchEvent(event)
        }
      }.apply {
        addView(webView)
        setOnChildScrollUpCallback { _, _ -> pageAtTop == false || webView.canScrollVertically(-1) }
        setOnRefreshListener {
          val unreachable = webView.url?.let { Uri.parse(it).getQueryParameter("unreachable") }

          // A forced reload: whatever the WebView cached goes first, so
          // the page always comes fresh from the computer
          webView.clearCache(true)
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

            // The bridge holds the share until the page connects
            val (id, share) = heldShare ?: return

            if (url != null && Servers.at(this@MainActivity, url)?.id == id) {
              heldShare = null
              bridge.send("share", share)
            }
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

    // A paired computer edited on the computers page: its name, and maybe a
    // new address or token, which must reach the same computer before
    // they're kept. A blank token keeps the one it has
    bridge.handle("editServer") { request, reply ->
      val params = request.paramsObject
      val server = Servers.all(this).find { it.id == params.getString("id") }

      if (server == null) {
        reply.error("That computer isn't paired")
        return@handle
      }

      val name = params.optString("name").trim().ifEmpty { server.name }
      val url = Servers.baseUrl(params.optString("url").ifEmpty { server.url })
      val token = params.optString("token").trim().ifEmpty { server.token }

      if (url == server.url && token == server.token) {
        Servers.update(this, server.copy(name = name))
        // Shortcuts name their computer when there's more than one
        AppShortcuts.publish(this)
        reply.ok(true)
        return@handle
      }

      Api.check(url, token) { result ->
        result.fold(
          { checked ->
            if (checked.id != server.id) {
              reply.error("A different computer answered at $url")
            } else {
              Servers.update(this, server.copy(name = name, url = url, token = token))
              AppShortcuts.publish(this)
              reply.ok(true)
              // Stays on the computers page, with the new origin allowed
              refreshOrigins(webView.url ?: pairingUrl)
            }
          },
          { reply.error(it.message ?: "Couldn't reach the computer") },
        )
      }
    }

    // A page the web client showed, counted towards the long-press
    // shortcuts, with the starting set it suggests
    bridge.handle("visitPage") { request, reply ->
      val server = webView.url?.let { url -> Servers.at(this, url) }

      if (server != null) {
        AppShortcuts.visit(this, server, request.paramsObject.getJSONObject("page"), request.paramsObject.getJSONArray("defaults"))
      }
      reply.ok(server != null)
    }

    // The share dialog sending its share to another paired computer
    bridge.handle("shareTo") { request, reply ->
      val params = request.paramsObject
      val server = Servers.all(this).find { server -> server.id == params.getString("id") }

      if (server == null) {
        reply.error("That computer isn't paired")
        return@handle
      }

      reply.ok(true)
      shareWith(server, params.getJSONObject("share"))
    }

    bridge.handle("pinPage") { request, reply ->
      val server = webView.url?.let { url -> Servers.at(this, url) }

      reply.ok(server != null && AppShortcuts.pin(this, server, request.paramsObject))
    }

    bridge.handle("removeServer") { request, reply ->
      val id = request.paramsObject.getString("id")

      Servers.remove(this, id)
      AppShortcuts.forget(this, id)
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
