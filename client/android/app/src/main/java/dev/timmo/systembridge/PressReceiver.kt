/**
 * A button pressed on a computer's pushed notification: the computer
 * presses the same button on its own, so whatever sent it hears, and both
 * notifications close.
 */
package dev.timmo.systembridge

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

class PressReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val server = Servers.all(context).find { it.id == intent.getStringExtra(SERVER) } ?: return
    val tag = intent.getStringExtra(TAG) ?: return
    val data =
      JSONObject().put("id", intent.getLongExtra(NOTIFICATION, 0)).put("action", intent.getStringExtra(ACTION))
    val pending = goAsync()

    Api.event(server, "NOTIFICATION_PRESS", data) { pressed ->
      if (pressed) {
        NotificationManagerCompat.from(context).cancel(tag, 0)
      } else {
        Toast.makeText(context, "Couldn't reach ${server.name}", Toast.LENGTH_SHORT).show()
      }
      pending.finish()
    }
  }

  companion object {
    private const val SERVER = "server"
    private const val NOTIFICATION = "notification"
    private const val ACTION = "action"
    private const val TAG = "tag"

    /** Presses a button on the computer's notification. */
    fun intent(context: Context, server: String, notification: Long, action: String, tag: String): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        "$tag:$action".hashCode(),
        Intent(context, PressReceiver::class.java)
          .putExtra(SERVER, server)
          .putExtra(NOTIFICATION, notification)
          .putExtra(ACTION, action)
          .putExtra(TAG, tag),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
  }
}
