/**
 * The shell's notification channels, the `notify` request and pushes: a
 * Notice from the view or a `PushPayload` becomes a system notification that
 * opens its link on a tap, and ongoing work becomes a Live Update on Android
 * 16 and a plain ongoing notification below it.
 */
package dev.timmo.groundwork.shell

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

class Notifications(private val context: Context, private val config: ShellConfig) {
  /** Creates the channels; the system keeps the person's settings for each. */
  fun createChannels() {
    val manager = context.getSystemService(NotificationManager::class.java)

    manager.createNotificationChannels(
      listOf(
        NotificationChannel(
          CHANNEL_NOTICES,
          config.labels.notifications,
          NotificationManager.IMPORTANCE_DEFAULT,
        ),
        NotificationChannel(CHANNEL_ONGOING, config.labels.ongoing, NotificationManager.IMPORTANCE_LOW),
      )
    )
  }

  /**
   * The color behind the small icon, from `gw_notification_color`, read at
   * each post so it follows the phone's light or dark mode.
   */
  private val accent: Int
    get() = context.getColor(R.color.gw_notification_color)

  /** Whether a notification can show now. */
  val allowed: Boolean
    get() =
      config.notifications &&
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
          PackageManager.PERMISSION_GRANTED &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()

  /**
   * Shows a Notice (`heading`, `body`, `tag`, `link`), or returns false when
   * notifications are off or not allowed, for the view to show it itself.
   */
  fun show(notice: JSONObject): Boolean =
    post(
      heading = notice.optString("heading"),
      body = notice.optString("body").ifEmpty { null },
      tag = notice.optString("tag").ifEmpty { null },
      link = notice.optString("link").ifEmpty { null },
      silent = false,
    )

  /**
   * Shows a push's `PushPayload`: its ongoing work when it has some,
   * otherwise a notification. False when it isn't a payload or can't show.
   */
  fun showPush(payload: JSONObject): Boolean {
    val title = payload.optString("title").ifEmpty { return false }
    val link = payload.optString("link").ifEmpty { null }

    payload.optJSONObject("ongoing")?.let { return showOngoing(title, it, link) }

    return post(
      heading = title,
      body = payload.optString("body").ifEmpty { null },
      tag = payload.optString("tag").ifEmpty { null },
      link = link,
      silent = payload.optString("level") == "passive",
    )
  }

  /**
   * Ongoing work (`id`, `status`, `progress`, `done`): each call with the
   * same id updates one notification, promoted to a Live Update on Android 16.
   */
  fun showOngoing(title: String, ongoing: JSONObject, link: String?): Boolean {
    if (!allowed) return false

    val id = ongoing.optString("id").ifEmpty { return false }
    val status = ongoing.optString("status")
    val done = ongoing.optBoolean("done", false)
    val progress = ongoing.optJSONObject("progress")
    val value = progress?.optInt("value") ?: 0
    val max = progress?.optInt("max") ?: 0
    val builder =
      Notification.Builder(context, CHANNEL_ONGOING)
        .setSmallIcon(R.drawable.gw_notification_icon)
        .setColor(accent)
        .setContentTitle(title)
        .setContentText(status)
        .setContentIntent(tapIntent(link, id))
        .setOngoing(!done)
        .setAutoCancel(done)
        .setOnlyAlertOnce(true)

    if (!done && Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
      val style = Notification.ProgressStyle().setProgressIndeterminate(progress == null)

      if (progress != null) {
        style.setProgressSegments(listOf(Notification.ProgressStyle.Segment(max.coerceAtLeast(1))))
        style.setProgress(value)
      }

      builder.setStyle(style).setRequestPromotedOngoing(true).setShortCriticalText(status.take(7))
    } else if (!done) {
      builder.setProgress(max, value, progress == null)
    }

    @Suppress("MissingPermission")
    NotificationManagerCompat.from(context).notify(ONGOING_TAG + id, 0, builder.build())

    return true
  }

  private fun post(heading: String, body: String?, tag: String?, link: String?, silent: Boolean): Boolean {
    if (!allowed || heading.isEmpty()) return false

    val notification =
      NotificationCompat.Builder(context, CHANNEL_NOTICES)
        .setSmallIcon(R.drawable.gw_notification_icon)
        .setColor(accent)
        .setContentTitle(heading)
        .apply { body?.let(::setContentText) }
        .setContentIntent(tapIntent(link, tag ?: heading))
        .setAutoCancel(true)
        .setSilent(silent)
        .build()

    @Suppress("MissingPermission")
    NotificationManagerCompat.from(context).notify(tag, if (tag == null) nextId++ else 0, notification)

    return true
  }

  /** Opens the app's launcher activity, at `link` when there is one. */
  private fun tapIntent(link: String?, key: String): PendingIntent {
    val open =
      (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        link?.let {
          action = Intent.ACTION_VIEW
          data = Uri.parse(it)
        }
      }

    return PendingIntent.getActivity(
      context,
      key.hashCode(),
      open,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  companion object {
    const val CHANNEL_NOTICES = "groundwork.notices"
    const val CHANNEL_ONGOING = "groundwork.ongoing"

    private const val ONGOING_TAG = "groundwork.ongoing."
    private var nextId = 1
  }
}
