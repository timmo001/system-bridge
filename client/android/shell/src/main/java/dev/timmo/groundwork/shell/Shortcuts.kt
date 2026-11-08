/**
 * Launcher shortcuts for the view: dynamic ones on a long press of the app's
 * icon, pinned ones on the home screen, and sharing shortcuts in the share
 * sheet's direct row. Each opens its `url` as a deep link, so the activity's
 * `deepLinkUrl` maps it as it does any other link.
 */
package dev.timmo.groundwork.shell

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.PathParser
import androidx.core.graphics.drawable.IconCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

class Shortcuts internal constructor(private val activity: ShellActivity) {
  /**
   * Replaces the dynamic shortcuts with `list`, ranked in order and capped
   * at what the launcher allows. Answers how many it published.
   */
  fun set(list: JSONArray): Int {
    val max = ShortcutManagerCompat.getMaxShortcutCountPerActivity(activity)
    val shortcuts = (0 until minOf(list.length(), max)).map { index -> build(list.getJSONObject(index), index) }

    enable(shortcuts)
    ShortcutManagerCompat.setDynamicShortcuts(activity, shortcuts)

    return shortcuts.size
  }

  /** Asks the launcher to pin `shortcut`; false where it can't. */
  fun pin(shortcut: JSONObject): Boolean {
    if (!ShortcutManagerCompat.isRequestPinShortcutSupported(activity)) return false

    val built = build(shortcut, 0)

    enable(listOf(built))

    return ShortcutManagerCompat.requestPinShortcut(activity, built, null)
  }

  /**
   * Takes the shortcuts with these ids away: dynamic ones go, and pinned ones
   * stay greyed out, showing `message` when tapped.
   */
  fun disable(ids: List<String>, message: String?) =
    ShortcutManagerCompat.disableShortcuts(activity, ids, message)

  /** The ids of every dynamic and pinned shortcut, such as to disable a group of them. */
  fun ids(): Set<String> {
    val flags = ShortcutManagerCompat.FLAG_MATCH_DYNAMIC or ShortcutManagerCompat.FLAG_MATCH_PINNED

    return ShortcutManagerCompat.getShortcuts(activity, flags).mapTo(mutableSetOf()) { shortcut -> shortcut.id }
  }

  /** A shortcut disabled before can't be published again until it's enabled. */
  private fun enable(shortcuts: List<ShortcutInfoCompat>) {
    val ids = shortcuts.mapTo(mutableSetOf()) { shortcut -> shortcut.id }
    val disabled =
      ShortcutManagerCompat.getShortcuts(activity, ShortcutManagerCompat.FLAG_MATCH_PINNED).filter { shortcut ->
        !shortcut.isEnabled && shortcut.id in ids
      }

    if (disabled.isNotEmpty()) ShortcutManagerCompat.enableShortcuts(activity, disabled)
  }

  private fun build(json: JSONObject, rank: Int): ShortcutInfoCompat {
    val label = json.getString("label")
    val intent =
      Intent(Intent.ACTION_VIEW, Uri.parse(json.getString("url")), activity, activity.javaClass)
        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val builder =
      ShortcutInfoCompat.Builder(activity, json.getString("id"))
        .setShortLabel(label)
        .setLongLabel(json.optString("longLabel").ifBlank { label })
        .setIntent(intent)
        .setIcon(icon(json.optString("icon").ifBlank { null }))
        .setRank(rank)

    // Neither long-lived, as the platform refuses one with a drawn icon, nor
    // kept out of the launcher, as the share sheet only reads shortcuts the
    // launcher can see
    if (json.optBoolean("share")) builder.setCategories(setOf(SHARE_CATEGORY))

    return builder.build()
  }

  /**
   * An SVG path on a 24 unit grid, such as a Material Design Icon, drawn in
   * `gw_shortcut_foreground` on `gw_shortcut_background`, or the app's icon
   * without one.
   */
  private fun icon(path: String?): IconCompat {
    if (path == null) return IconCompat.createWithResource(activity, activity.applicationInfo.icon)

    val density = activity.resources.displayMetrics.density
    // An adaptive icon is 108dp, of which the launcher shows about the middle 72
    val size = (108 * density).roundToInt()
    val glyph = 40 * density
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = activity.getColor(R.color.gw_shortcut_foreground) }

    canvas.drawColor(activity.getColor(R.color.gw_shortcut_background))
    canvas.translate((size - glyph) / 2, (size - glyph) / 2)
    canvas.scale(glyph / 24, glyph / 24)
    canvas.drawPath(PathParser.createPathFromPathData(path), paint)

    return IconCompat.createWithAdaptiveBitmap(bitmap)
  }

  companion object {
    /**
     * The category a sharing shortcut has, which the app's `share-target` in
     * `res/xml/shortcuts.xml` names.
     */
    const val SHARE_CATEGORY = "dev.timmo.groundwork.shell.SHARE_TARGET"
  }
}
