/**
 * The phone's dynamic color, read from the system's Material roles in both
 * modes and sent to the view as `androidTheme`, the shape
 * `AndroidSchemeColors` in the view package reads.
 */
package dev.timmo.groundwork.shell

import android.content.Context
import org.json.JSONObject

object AndroidTheme {
  private val roles =
    mapOf(
      "surface" to (android.R.color.system_surface_light to android.R.color.system_surface_dark),
      "surfaceContainerLowest" to
        (android.R.color.system_surface_container_lowest_light to
          android.R.color.system_surface_container_lowest_dark),
      "surfaceContainer" to
        (android.R.color.system_surface_container_light to
          android.R.color.system_surface_container_dark),
      "surfaceContainerHigh" to
        (android.R.color.system_surface_container_high_light to
          android.R.color.system_surface_container_high_dark),
      "onSurface" to
        (android.R.color.system_on_surface_light to android.R.color.system_on_surface_dark),
      "onSurfaceVariant" to
        (android.R.color.system_on_surface_variant_light to
          android.R.color.system_on_surface_variant_dark),
      "outlineVariant" to
        (android.R.color.system_outline_variant_light to
          android.R.color.system_outline_variant_dark),
      "primary" to (android.R.color.system_primary_light to android.R.color.system_primary_dark),
      "error" to (android.R.color.system_error_light to android.R.color.system_error_dark),
    )

  /** The `androidTheme` message's data: both modes' roles as `#rrggbb`. */
  fun read(context: Context): JSONObject {
    val light = JSONObject()
    val dark = JSONObject()

    for ((role, ids) in roles) {
      light.put(role, hex(context.getColor(ids.first)))
      dark.put(role, hex(context.getColor(ids.second)))
    }

    return JSONObject().put("colors", JSONObject().put("light", light).put("dark", dark))
  }

  /** The message's data when the config turns dynamic color off. */
  val none: JSONObject
    get() = JSONObject().put("colors", JSONObject.NULL)

  private fun hex(color: Int) = "#%06x".format(color and 0xffffff)
}
