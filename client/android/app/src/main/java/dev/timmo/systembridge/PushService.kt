/**
 * System Bridge's pushes. The shell shows a push as a plain notification;
 * the app shows a paired computer's own: named for the computer it came
 * from, with its buttons, and cleared when the one on the computer closes.
 * Anything else, such as ongoing work, goes to the shell.
 */
package dev.timmo.systembridge

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import dev.timmo.groundwork.shell.Notifications
import dev.timmo.groundwork.shell.ShellConfig
import dev.timmo.groundwork.shell.ShellPushService
import org.json.JSONObject
import org.unifiedpush.android.connector.data.PushMessage

class PushService : ShellPushService() {
  override fun onMessage(message: PushMessage, instance: String) {
    val payload = runCatching { JSONObject(message.content.decodeToString()) }.getOrNull()
    val server = Servers.forPush(this, instance)

    if (!message.decrypted || payload == null || server == null || payload.has("ongoing")) {
      super.onMessage(message, instance)
      return
    }

    // The notification closed on the computer, so it goes from here too
    payload.optString("dismiss").ifEmpty { null }?.let { tag ->
      NotificationManagerCompat.from(this).cancel(tag, 0)
      return
    }

    show(this, server, payload)
  }

  companion object {
    /** Shows a computer's push, named for it, with a button for each action. */
    fun show(context: Context, server: Server, payload: JSONObject) {
      val notices = Notifications(context, ShellConfig.load(context))
      val title = payload.optString("title").ifEmpty { return }
      val tag = payload.optString("tag").ifEmpty { "${server.id}:$title" }

      if (
        !notices.allowed ||
          context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
      ) {
        return
      }

      notices.createChannels()

      val builder =
        NotificationCompat.Builder(context, Notifications.CHANNEL_NOTICES)
          .setSmallIcon(dev.timmo.groundwork.shell.R.drawable.gw_notification_icon)
          .setColor(context.getColor(dev.timmo.groundwork.shell.R.color.gw_notification_color))
          .setContentTitle(title)
          .setSubText(server.name)
          .apply { payload.optString("body").ifEmpty { null }?.let(::setContentText) }
          .setContentIntent(open(context, payload.optString("link").ifEmpty { null }, tag))
          .setAutoCancel(true)
          .setSilent(payload.optString("level") == "passive")

      val notification = payload.optLong("notification")
      val actions = payload.optJSONArray("actions")

      if (notification > 0 && actions != null) {
        for (index in 0 until actions.length()) {
          val action = actions.optJSONObject(index) ?: continue
          val id = action.optString("id").ifEmpty { continue }

          builder.addAction(
            0,
            action.optString("label").ifEmpty { id },
            PressReceiver.intent(context, server.id, notification, id, tag),
          )
        }
      }

      NotificationManagerCompat.from(context).notify(tag, 0, builder.build())
    }

    /** Opens the app on the push's page, as the shell's notifications do. */
    private fun open(context: Context, link: String?, key: String): PendingIntent {
      val intent =
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
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }
  }
}
