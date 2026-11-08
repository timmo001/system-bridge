/**
 * Media controls for the current computer's player: a media session the
 * system shows in the notifications and on the lock screen, kept current
 * over the computer's WebSocket. Off until turned on on the computers page.
 * Once on, it starts as the app opens and runs while something plays. It
 * stops when nothing has played for ten minutes or the computer can't be
 * reached, and starts again the next time the app opens.
 */
package dev.timmo.systembridge

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import java.util.UUID
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject

/** Whether media controls are on, kept in the app's preferences, and starting or stopping them. */
object MediaControls {
  private const val PREFS = "systembridge.media"
  private const val ENABLED = "enabled"

  fun enabled(context: Context): Boolean = prefs(context).getBoolean(ENABLED, false)

  fun set(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(ENABLED, enabled).apply()

    if (enabled) start(context) else context.stopService(Intent(context, MediaControlService::class.java))
  }

  /**
   * Starts them, or points them at a computer that became the current one.
   * Only while the app is in use, as Android doesn't let a service start
   * from the background.
   */
  fun start(context: Context) {
    if (!enabled(context) || Servers.current(context) == null) return

    try {
      context.startService(Intent(context, MediaControlService::class.java))
    } catch (_: IllegalStateException) {
      // The app is in the background, such as a page reloading there; they
      // start the next time it opens
    }
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

@OptIn(UnstableApi::class)
class MediaControlService : MediaSessionService() {
  private val main = Handler(Looper.getMainLooper())
  private val http = OkHttpClient.Builder().pingInterval(30, TimeUnit.SECONDS).build()
  private lateinit var player: ComputerPlayer
  private lateinit var session: MediaSession
  private var server: Server? = null
  private var socket: WebSocket? = null
  private var failures = 0
  private var idle = false
  private val stopWhenIdle = Runnable { stopSelf() }

  override fun onCreate() {
    super.onCreate()

    player = ComputerPlayer { request -> server?.let { current -> Api.event(current, "MEDIA_CONTROL", request) {} } }
    session = MediaSession.Builder(this, player).build()
    // Nothing in the app binds to it, so its notification needs the session
    // added by hand
    addSession(session)
    setMediaNotificationProvider(
      DefaultMediaNotificationProvider.Builder(this).build().apply { setSmallIcon(R.drawable.gw_notification_icon) }
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)

    val current = Servers.current(this)

    if (!MediaControls.enabled(this) || current == null) {
      stopSelf()
    } else if (current != server || socket == null) {
      connect(current)
    }

    return START_NOT_STICKY
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession = session

  override fun onDestroy() {
    main.removeCallbacksAndMessages(null)
    socket?.close(NORMAL_CLOSURE, null)
    socket = null
    session.release()
    player.release()
    super.onDestroy()
  }

  /** Follows a computer's player, opening its Media page on a tap. */
  private fun connect(current: Server) {
    socket?.close(NORMAL_CLOSURE, null)
    server = current
    failures = 0

    val media =
      Intent(Intent.ACTION_VIEW, Uri.parse(AppShortcuts.link(current.id, "/media")), this, MainActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    session.setSessionActivity(
      PendingIntent.getActivity(this, 0, media, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    )
    open(current)
  }

  private fun open(current: Server) {
    // http://host:9170/ becomes ws://host:9170/api/websocket, https wss
    val url = current.url.replaceFirst("http", "ws") + "api/websocket"

    socket = http.newWebSocket(Request.Builder().url(url).build(), Listener(current))
  }

  /** New data: the controls follow it, and a wait to stop starts once nothing plays. */
  private fun onMedia(media: JSONObject) {
    failures = 0
    player.update(media)

    if (player.playing) {
      idle = false
      main.removeCallbacks(stopWhenIdle)
    } else if (!idle) {
      idle = true
      main.postDelayed(stopWhenIdle, IDLE_MS)
    }
  }

  /** Tries the computer again, a little later each time, then gives up. */
  private fun retry(current: Server) {
    socket = null
    failures += 1

    if (failures > MAX_FAILURES) {
      stopSelf()
      return
    }

    main.postDelayed({ if (socket == null && server == current) open(current) }, RETRY_MS * failures)
  }

  private inner class Listener(private val current: Server) : WebSocketListener() {
    override fun onOpen(webSocket: WebSocket, response: Response) {
      for (event in listOf("REGISTER_DATA_LISTENER", "GET_DATA")) {
        val message =
          JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("event", event)
            .put("data", JSONObject().put("modules", JSONArray().put("media")))
            .put("token", current.token)

        webSocket.send(message.toString())
      }
    }

    override fun onMessage(webSocket: WebSocket, text: String) {
      val message = runCatching { JSONObject(text) }.getOrNull() ?: return

      if (message.optString("type") != "DATA_UPDATE" || message.optString("module") != "media") return

      val media = message.optJSONObject("data") ?: return

      main.post { if (socket === webSocket) onMedia(media) }
    }

    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
      main.post { if (socket === webSocket) retry(current) }
    }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
      main.post { if (socket === webSocket) retry(current) }
    }
  }

  private companion object {
    const val NORMAL_CLOSURE = 1000
    const val IDLE_MS = 10L * 60 * 1000
    const val RETRY_MS = 5_000L
    const val MAX_FAILURES = 5
  }
}
