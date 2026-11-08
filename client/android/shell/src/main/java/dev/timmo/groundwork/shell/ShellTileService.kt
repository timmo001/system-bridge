/**
 * A quick settings tile the app configures in its manifest: the label and
 * icon on the `<service>`, and a `groundwork.tileLink` meta-data entry for
 * the page a tap opens. An app subclasses it to do something else on a tap.
 * At most two per app, so the shade stays tidy.
 */
package dev.timmo.groundwork.shell

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

open class ShellTileService : TileService() {
  /** The page a tap opens, from the service's `groundwork.tileLink` meta-data. */
  open val link: String?
    get() =
      packageManager
        .getServiceInfo(ComponentName(this, javaClass), PackageManager.GET_META_DATA)
        .metaData
        ?.getString("groundwork.tileLink")

  override fun onStartListening() {
    qsTile?.apply {
      state = Tile.STATE_INACTIVE
      updateTile()
    }
  }

  /** Opens the app at `link`; override to act without opening it. */
  override fun onClick() {
    val open =
      (packageManager.getLaunchIntentForPackage(packageName) ?: return).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        link?.let {
          action = Intent.ACTION_VIEW
          data = Uri.parse(it)
        }
      }

    startActivityAndCollapse(
      PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    )
  }
}
