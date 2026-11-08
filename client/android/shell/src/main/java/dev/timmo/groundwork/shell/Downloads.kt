/**
 * Files the page makes itself, such as an export, saved to the phone's
 * Downloads. The WebView ignores `<a download>` on their `blob:` and
 * `data:` links, so the page sends them through `saveFile`, and the shell
 * writes them through MediaStore, which needs no permission.
 */
package dev.timmo.groundwork.shell

import android.content.ContentValues
import android.net.Uri
import android.provider.MediaStore
import android.util.Base64
import android.widget.Toast
import org.json.JSONObject

class Downloads internal constructor(private val activity: ShellActivity) {
  /** Saves `bytes` as `name` in Downloads, says so, and answers where. */
  fun save(name: String, type: String, bytes: ByteArray): Uri {
    val resolver = activity.contentResolver
    val values =
      ContentValues().apply {
        put(MediaStore.Downloads.DISPLAY_NAME, name)
        put(MediaStore.Downloads.MIME_TYPE, type)
        put(MediaStore.Downloads.IS_PENDING, 1)
      }
    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("Couldn't save $name")

    try {
      resolver.openOutputStream(uri)?.use { stream -> stream.write(bytes) } ?: error("Couldn't write $name")
    } catch (failure: Exception) {
      resolver.delete(uri, null, null)
      throw failure
    }

    resolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
    Toast.makeText(activity, activity.config.labels.fileSaved, Toast.LENGTH_SHORT).show()

    return uri
  }

  /** Saves the view's `saveFile` request: `{ name, type, data }`, with the data in base64. */
  fun save(request: JSONObject): Uri =
    save(
      request.getString("name"),
      request.optString("type").ifBlank { "application/octet-stream" },
      Base64.decode(request.getString("data"), Base64.DEFAULT),
    )

}
