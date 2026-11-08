/**
 * The app's `mobile.config`, as the app's build writes it to
 * `assets/groundwork/mobile.config.json`. Every default is on unless the
 * config turns it off, matching `resolveConfig` in the view package.
 */
package dev.timmo.groundwork.shell

import android.content.Context
import org.json.JSONObject

data class ShellLabels(
  val notifications: String = "Notifications",
  val ongoing: String = "Ongoing",
  val downloadFinished: String = "Download finished",
  val fileSaved: String = "Saved to Downloads",
)

data class ShellConfig(
  /** A hosted page to open instead of the bundled build. */
  val url: String? = null,
  val origins: List<String> = emptyList(),
  val shares: Boolean = true,
  val notifications: Boolean = true,
  val push: Boolean = true,
  val deepLinks: Boolean = true,
  val externalLinks: Boolean = true,
  val externalSchemes: List<String> = listOf("mailto", "tel"),
  val back: Boolean = true,
  val downloads: Boolean = true,
  val media: Boolean = true,
  val files: Boolean = true,
  val androidTheme: Boolean = true,
  val devTools: Boolean = true,
  val labels: ShellLabels = ShellLabels(),
) {
  companion object {
    const val ASSET = "groundwork/mobile.config.json"

    /** Reads the config the app's build bundled, or the defaults without one. */
    fun load(context: Context): ShellConfig =
      runCatching { context.assets.open(ASSET).bufferedReader().use { it.readText() } }
        .map { parse(JSONObject(it)) }
        .getOrDefault(ShellConfig())

    fun parse(json: JSONObject): ShellConfig {
      val defaults = ShellConfig()
      val labels = json.optJSONObject("labels") ?: JSONObject()

      fun flag(name: String, default: Boolean) = json.optBoolean(name, default)

      fun strings(name: String, default: List<String>) =
        json.optJSONArray(name)?.let { array -> List(array.length()) { array.getString(it) } }
          ?: default

      return ShellConfig(
        url = if (json.isNull("url")) null else json.getString("url").ifBlank { null },
        origins = strings("origins", defaults.origins),
        shares = flag("shares", defaults.shares),
        notifications = flag("notifications", defaults.notifications),
        push = flag("push", defaults.push),
        deepLinks = flag("deepLinks", defaults.deepLinks),
        externalLinks = flag("externalLinks", defaults.externalLinks),
        externalSchemes = strings("externalSchemes", defaults.externalSchemes),
        back = flag("back", defaults.back),
        downloads = flag("downloads", defaults.downloads),
        media = flag("media", defaults.media),
        files = flag("files", defaults.files),
        androidTheme = flag("androidTheme", defaults.androidTheme),
        devTools = flag("devTools", defaults.devTools),
        labels =
          ShellLabels(
            notifications = labels.optString("notifications", defaults.labels.notifications),
            ongoing = labels.optString("ongoing", defaults.labels.ongoing),
            downloadFinished =
              labels.optString("downloadFinished", defaults.labels.downloadFinished),
            fileSaved = labels.optString("fileSaved", defaults.labels.fileSaved),
          ),
      )
    }
  }
}
