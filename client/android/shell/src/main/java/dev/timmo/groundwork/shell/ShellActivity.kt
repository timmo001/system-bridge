/**
 * The shell's activity: a WebView on the app's bundled web build, or its dev
 * server in debug builds, with the bridge and every default `mobile.config`
 * turns on. An app subclasses it, registers its own handlers in
 * `onBridgeReady`, and overrides any hook rather than editing this file.
 */
package dev.timmo.groundwork.shell

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

open class ShellActivity : ComponentActivity() {
  lateinit var webView: WebView
    private set

  lateinit var config: ShellConfig
    private set

  lateinit var bridge: Bridge
    private set

  lateinit var notifications: Notifications
    private set

  /** The launcher's shortcuts, for the app's own handlers too. */
  val shortcuts by lazy { Shortcuts(this) }

  /** Saves files the page makes itself to Downloads, for the app's own handlers too. */
  val downloads by lazy { Downloads(this) }

  private lateinit var assetLoader: WebViewAssetLoader
  private var lastTheme: String? = null
  private var pendingFiles: ValueCallback<Array<Uri>>? = null
  private var pendingPermission: PermissionRequest? = null

  /** True in debug builds of the app. */
  val dev: Boolean
    get() = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0

  /**
   * The page the shell opens: the dev server in debug builds when the app's
   * manifest names one in `groundwork.devUrl`, then the hosted page in
   * `config.url`, otherwise the bundled build under `assets/web/`. Override
   * it to pick one at run time, such as a service the person paired with.
   */
  open val startUrl: String
    get() = devUrl.takeIf { dev } ?: config.url ?: "$APP_ORIGIN/index.html"

  /** The app's own origin, always allowed to use the bridge. */
  val appOrigin: String
    get() = originOf(startUrl)

  private val devUrl: String?
    get() =
      packageManager
        .getApplicationInfo(packageName, PackageManager.GET_META_DATA)
        .metaData
        ?.getString("groundwork.devUrl")
        ?.ifBlank { null }

  private val chooseFiles =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      pendingFiles?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
      pendingFiles = null
    }

  private val askMedia =
    registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
      val request = pendingPermission ?: return@registerForActivityResult
      pendingPermission = null
      val allowed = request.resources.filter { granted[permissionFor(it)] == true }.toTypedArray()

      if (allowed.isEmpty()) request.deny() else request.grant(allowed)
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    config = loadConfig()
    notifications = Notifications(this, config).also { if (config.notifications) it.createChannels() }
    bridge = Bridge { allowedOrigins() }
    assetLoader =
      WebViewAssetLoader.Builder()
        .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this).let { assets ->
          // Any page in the app falls back to index.html, as a static host
          // set up for a single-page app would
          WebViewAssetLoader.PathHandler { path ->
            assets.handle("web/${path.ifEmpty { "index.html" }}") ?: assets.handle("web/index.html")
          }
        })
        .build()

    WebView.setWebContentsDebuggingEnabled(dev && config.devTools)
    webView = createWebView()
    // The page draws under the system bars and cutout and pads itself with
    // `env(safe-area-inset-*)`, which the WebView fills in; only the
    // keyboard pads the frame, so the page resizes above it
    val frame = FrameLayout(this).apply { addView(webView) }

    setContentView(frame)
    ViewCompat.setOnApplyWindowInsetsListener(frame) { view, insets ->
      val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
      view.updatePadding(bottom = keyboard.bottom)
      insets
    }

    registerShellHandlers()
    onBridgeReady(bridge)
    bridge.attach(webView)

    if (config.back) onBackPressedDispatcher.addCallback(this, backCallback)

    if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
      webView.loadUrl(deepLinkUrl(intent) ?: startUrl)
      shareOf(intent)?.let { bridge.send("share", it) }
    }
  }

  /** Reads `mobile.config`; override to build one in code. */
  protected open fun loadConfig(): ShellConfig = ShellConfig.load(this)

  /** Every origin the bridge answers: the app's own and `config.origins`. */
  protected open fun allowedOrigins(): Set<String> = setOf(appOrigin) + config.origins

  /** Registers the app's own handlers, or replaces the shell's, by name. */
  protected open fun onBridgeReady(bridge: Bridge) = Unit

  /** Makes the WebView; override to change its settings after calling this. */
  @SuppressLint("SetJavaScriptEnabled")
  protected open fun createWebView(): WebView =
    WebView(this).apply {
      layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.mediaPlaybackRequiresUserGesture = false
      settings.allowFileAccess = false
      settings.allowContentAccess = false

      // The page follows the theme's isLightTheme through prefers-color-scheme
      // and is never darkened by the WebView.
      if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
        WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false)
      }

      CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
      webViewClient = ShellWebViewClient()
      webChromeClient = ShellChromeClient()
      if (config.downloads) setDownloadListener(::download)
    }

  private fun registerShellHandlers() {
    bridge.handle("info") { _, reply ->
      reply.ok(JSONObject().put("dev", dev).put("version", VERSION))
    }
    bridge.handle("openExternal") { request, reply ->
      reply.ok(openExternal(Uri.parse(request.paramsObject.getString("url"))))
    }
    bridge.handle("notify") { request, reply ->
      reply.ok(notifications.show(request.paramsObject))
    }
    bridge.handle("androidTheme") { _, reply -> reply.ok(currentTheme()) }
    bridge.handle("localNetwork") { _, reply -> withLocalNetwork { reply.ok(it) } }
    bridge.handle("discoverServices") { request, reply ->
      val params = request.paramsObject
      val type = params.getString("type")
      val timeoutMs = params.optLong("timeoutMs", ServiceDiscovery.DEFAULT_TIMEOUT_MS)
      val run = { picker: Boolean ->
        discovery.discover(type, picker, timeoutMs) { result ->
          result.fold({ reply.ok(it) }, { reply.error(it.message ?: "Discovery failed") })
        }
      }

      // The picker unless asked not to, or the app may browse already
      when {
        params.optString("mode") == "picker" -> run(true)
        params.optString("mode") == "browse" -> withLocalNetwork { run(false) }
        !discovery.localNetworkGated ||
          checkSelfPermission(ACCESS_LOCAL_NETWORK) == PackageManager.PERMISSION_GRANTED -> run(false)
        else -> run(true)
      }
    }
    bridge.handle("scanQr") { request, reply ->
      scanQr(request.paramsObject.optString("hint").ifBlank { null }) { result ->
        result.fold({ reply.ok(it) }, { reply.error(it.message ?: "Scanning failed") })
      }
    }
    bridge.handle("setShortcuts") { request, reply ->
      reply.ok(shortcuts.set(request.paramsObject.getJSONArray("shortcuts")))
    }
    bridge.handle("pinShortcut") { request, reply -> reply.ok(shortcuts.pin(request.paramsObject)) }
    bridge.handle("saveFile") { request, reply ->
      downloads.save(request.paramsObject)
      reply.ok(true)
    }
    bridge.handle("disableShortcuts") { request, reply ->
      val params = request.paramsObject
      val ids = params.getJSONArray("ids").let { list -> (0 until list.length()).map(list::getString) }

      shortcuts.disable(ids, params.optString("message").ifBlank { null })
      reply.ok(true)
    }

    if (!config.push) {
      bridge.handle("pushState") { _, reply -> reply.ok("unsupported") }
      bridge.handle("subscribePush") { _, reply -> reply.ok("unsupported") }
      bridge.handle("unsubscribePush") { _, reply -> reply.ok(false) }
      return
    }

    bridge.handle("pushState") { _, reply -> reply.ok(Push.state(this)) }
    bridge.handle("subscribePush") { request, reply ->
      withNotificationPermission { granted ->
        if (granted) Push.subscribe(this, request.paramsObject) { reply.ok(it) } else reply.ok("denied")
      }
    }
    bridge.handle("unsubscribePush") { request, reply ->
      Push.unsubscribe(this, request.paramsObject) { reply.ok(true) }
    }
  }

  private var pendingPermissionResult: ((Boolean) -> Unit)? = null

  private val askPermission =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      pendingPermissionResult?.invoke(granted)
      pendingPermissionResult = null
    }

  private var pendingScan: ((String?) -> Unit)? = null

  private val scan =
    registerForActivityResult(ScanActivity.Scan()) { text ->
      pendingScan?.invoke(text)
      pendingScan = null
    }

  private val discovery by lazy { ServiceDiscovery(this) }

  /** True when the app's manifest declares `permission`. */
  protected fun declares(permission: String): Boolean =
    packageManager
      .getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong()))
      .requestedPermissions
      ?.contains(permission) == true

  /** Asks for `permission` when it isn't granted yet, then calls `then`. */
  protected fun withPermission(permission: String, then: (Boolean) -> Unit) {
    if (checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) {
      then(true)
      return
    }

    pendingPermissionResult?.invoke(false)
    pendingPermissionResult = then
    askPermission.launch(permission)
  }

  /** Asks for notifications when they aren't allowed yet, then calls `then`. */
  protected fun withNotificationPermission(then: (Boolean) -> Unit) =
    withPermission(Manifest.permission.POST_NOTIFICATIONS, then)

  /**
   * Local network access: `granted` where it isn't gated (before Android 17,
   * or an app targeting less) or the person allowed it, `denied`, or
   * `undeclared` when the app's manifest lacks ACCESS_LOCAL_NETWORK.
   */
  protected fun withLocalNetwork(then: (String) -> Unit) {
    if (!discovery.localNetworkGated) return then("granted")
    if (!declares(ACCESS_LOCAL_NETWORK)) return then("undeclared")

    withPermission(ACCESS_LOCAL_NETWORK) { then(if (it) "granted" else "denied") }
  }

  /** Opens the QR scanner, with the camera permission, and passes on its text or null. */
  protected fun scanQr(hint: String?, then: (Result<String?>) -> Unit) {
    if (!declares(Manifest.permission.CAMERA)) {
      then(Result.failure(IllegalStateException("The app's manifest doesn't declare the CAMERA permission")))
      return
    }

    withPermission(Manifest.permission.CAMERA) { granted ->
      if (!granted) return@withPermission then(Result.success(null))

      pendingScan?.invoke(null)
      pendingScan = { then(Result.success(it)) }
      scan.launch(hint)
    }
  }

  /**
   * Applies a change to `allowedOrigins` and opens `url`, such as a service
   * the person just paired with. The WebView only reads the origins when the
   * bridge is injected, so it's injected again before the page loads.
   */
  fun refreshOrigins(url: String = startUrl) {
    bridge.reattach(webView)
    webView.loadUrl(url)
  }

  /**
   * A share from another app (`ACTION_SEND` with text or a link), as the
   * view's `ShellShare`, with the id of the sharing shortcut it was sent to.
   * Null when the intent isn't one or `shares` is off.
   */
  protected open fun shareOf(intent: Intent?): JSONObject? {
    if (!config.shares || intent?.action != Intent.ACTION_SEND) return null

    val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: return null
    val title = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: intent.getStringExtra(Intent.EXTRA_TITLE)
    val share = JSONObject()

    title?.let { share.put("title", it) }
    intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)?.let { share.put("shortcutId", it) }

    if (URLUtil.isNetworkUrl(text.trim())) share.put("url", text.trim()) else share.put("text", text)

    return share
  }

  private fun currentTheme(): JSONObject =
    if (config.androidTheme) AndroidTheme.read(this) else AndroidTheme.none

  /** Sends the dynamic color again when it changed, such as with a new wallpaper. */
  private fun sendThemeIfChanged() {
    if (!config.androidTheme) return

    val theme = currentTheme()
    val text = theme.toString()

    if (lastTheme != null && lastTheme != text) bridge.send("androidTheme", theme)
    lastTheme = text
  }

  override fun onResume() {
    super.onResume()
    sendThemeIfChanged()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    sendThemeIfChanged()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)

    shareOf(intent)?.let {
      bridge.send("share", it)
      return
    }

    val url = deepLinkUrl(intent) ?: return

    bridge.send("deepLink", JSONObject().put("url", url))
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    webView.saveState(outState)
  }

  override fun onDestroy() {
    webView.destroy()
    super.onDestroy()
  }

  /**
   * The page a deep link or App Link opens: links on an allowed origin open
   * as they are, the app's own scheme maps onto its pages. Null when the
   * intent isn't one, or `deepLinks` is off.
   */
  protected open fun deepLinkUrl(intent: Intent?): String? {
    if (!config.deepLinks || intent?.action != Intent.ACTION_VIEW) return null

    val data = intent.data ?: return null

    if (isAllowed(data)) return data.toString()

    // `my-app://#page` has an empty host and path, which mustn't leave a `//`
    val path = listOfNotNull(data.host, data.path?.trimStart('/')).filter { part -> part.isNotEmpty() }.joinToString("/")
    val query = data.encodedQuery?.let { "?$it" } ?: ""
    val fragment = data.encodedFragment?.let { "#$it" } ?: ""

    return "$appOrigin/$path$query$fragment"
  }

  /** Opens a URL in the browser or the app that handles it. */
  protected open fun openExternal(uri: Uri): Boolean =
    try {
      startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE))
      true
    } catch (_: ActivityNotFoundException) {
      false
    }

  private fun isAllowed(uri: Uri): Boolean = originOf(uri.toString()) in allowedOrigins()

  private fun download(url: String, userAgent: String, disposition: String, mimeType: String, length: Long) {
    val name = URLUtil.guessFileName(url, disposition, mimeType)
    val request =
      DownloadManager.Request(Uri.parse(url))
        .setMimeType(mimeType)
        .addRequestHeader("User-Agent", userAgent)
        .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
        .setTitle(name)
        .setDescription(config.labels.downloadFinished)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)

    getSystemService(DownloadManager::class.java).enqueue(request)
  }

  private val backCallback =
    object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        if (webView.canGoBack()) {
          webView.goBack()
          return
        }

        isEnabled = false
        onBackPressedDispatcher.onBackPressed()
        isEnabled = true
      }
    }

  /** Serves the bundled build, keeps allowed pages in the app and opens the rest outside. */
  protected open inner class ShellWebViewClient : WebViewClientCompat() {
    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
      assetLoader.shouldInterceptRequest(request.url)

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
      val uri = request.url

      if (isAllowed(uri)) return false

      val scheme = uri.scheme?.lowercase()
      val external =
        (scheme == "http" || scheme == "https") && config.externalLinks ||
          scheme in config.externalSchemes

      if (external) openExternal(uri)

      return true
    }

    override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
      bridge.detach()
    }
  }

  /** The camera and microphone, and the file chooser, when the config allows them. */
  protected open inner class ShellChromeClient : WebChromeClient() {
    override fun onPermissionRequest(request: PermissionRequest) {
      val wanted = request.resources.mapNotNull(::permissionFor)

      if (!config.media || !isAllowed(request.origin) || wanted.isEmpty()) {
        request.deny()
        return
      }

      pendingPermission?.deny()
      pendingPermission = request
      askMedia.launch(wanted.toTypedArray())
    }

    override fun onShowFileChooser(
      webView: WebView,
      callback: ValueCallback<Array<Uri>>,
      params: FileChooserParams,
    ): Boolean {
      if (!config.files) return false

      pendingFiles?.onReceiveValue(null)
      pendingFiles = callback

      return try {
        chooseFiles.launch(params.createIntent())
        true
      } catch (_: ActivityNotFoundException) {
        pendingFiles = null
        false
      }
    }
  }

  companion object {
    /** The bundled build's origin, served from `assets/web/` by the asset loader. */
    const val APP_ORIGIN = "https://${WebViewAssetLoader.DEFAULT_DOMAIN}"

    /** The shell's version, reported to the view by `info`. */
    const val VERSION = "0.4.0"

    /** Android 17's local network permission, by name so older SDKs compile. */
    const val ACCESS_LOCAL_NETWORK = "android.permission.ACCESS_LOCAL_NETWORK"

    private fun originOf(url: String): String =
      Uri.parse(url).let { uri ->
        val port = if (uri.port == -1) "" else ":${uri.port}"
        "${uri.scheme}://${uri.host}$port"
      }

    private fun permissionFor(resource: String): String? =
      when (resource) {
        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> Manifest.permission.CAMERA
        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> Manifest.permission.RECORD_AUDIO
        else -> null
      }
  }
}
