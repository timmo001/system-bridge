/**
 * The app's notification categories: a group for each paired computer,
 * under the name it was given, with a category for each kind of push, so a
 * computer, or only its updates, can be muted in the system's settings.
 */
package dev.timmo.systembridge

import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.content.Context

object Channels {
  private const val NOTIFICATIONS = "notifications"
  private const val UPDATES = "updates"

  /** The category a computer's push of this kind goes in, made if it's new. */
  fun forPush(context: Context, server: Server, kind: String): String {
    sync(context)

    return channelId(server, if (kind == UPDATES) UPDATES else NOTIFICATIONS)
  }

  /**
   * Makes a group and its categories for each paired computer, renaming any
   * whose computer was renamed, and drops those of computers removed. The
   * system keeps each category's settings across these.
   */
  fun sync(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)
    val servers = Servers.all(context)

    manager.createNotificationChannelGroups(servers.map { NotificationChannelGroup(it.id, it.name) })
    manager.createNotificationChannels(
      servers.flatMap { server ->
        listOf(
          NotificationChannel(channelId(server, NOTIFICATIONS), "Notifications", NotificationManager.IMPORTANCE_DEFAULT)
            .apply {
              description = "The notifications System Bridge shows on ${server.name}"
              group = server.id
            },
          NotificationChannel(channelId(server, UPDATES), "Updates", NotificationManager.IMPORTANCE_LOW).apply {
            description = "When a new System Bridge release is out for ${server.name}"
            group = server.id
          },
        )
      }
    )

    val paired = servers.map { it.id }.toSet()

    manager.notificationChannelGroups.filter { it.id !in paired }.forEach { manager.deleteNotificationChannelGroup(it.id) }
  }

  private fun channelId(server: Server, kind: String) = "${server.id}.$kind"
}
