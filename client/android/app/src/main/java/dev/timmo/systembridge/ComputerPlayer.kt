/**
 * A Media3 player standing in for the computer's: its state is the media
 * module's latest data, and each command it takes goes to the computer as a
 * MEDIA_CONTROL, whose result comes back as new data. The system's media
 * controls show it like any other player.
 */
package dev.timmo.systembridge

import android.net.Uri
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.SimpleBasePlayer
import androidx.media3.common.util.UnstableApi
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject

@OptIn(UnstableApi::class)
class ComputerPlayer(private val control: (JSONObject) -> Unit) : SimpleBasePlayer(Looper.getMainLooper()) {
  private var media: JSONObject? = null

  /** Where the track is, moving on from when the data came while it plays. */
  private var position: PositionSupplier = PositionSupplier.ZERO

  /** True while the computer's player plays. */
  val playing: Boolean
    get() = text("status") == "PLAYING"

  /** Takes the media module's new data. */
  fun update(data: JSONObject) {
    media = data

    val positionMs = (data.optDouble("position", 0.0) * 1000).toLong()

    position =
      if (playing) PositionSupplier.getExtrapolating(positionMs, rate())
      else PositionSupplier.getConstant(positionMs)
    invalidateState()
  }

  override fun getState(): State {
    val status = text("status")

    if (status == null || status == "STOPPED") {
      return State.Builder().setAvailableCommands(Player.Commands.EMPTY).setPlaybackState(Player.STATE_IDLE).build()
    }

    val duration = media?.optDouble("duration", Double.NaN)?.takeUnless { seconds -> seconds.isNaN() || seconds <= 0 }
    val previous = enabled("is_previous_enabled")
    val next = enabled("is_next_enabled")
    val seekable = enabled("is_seek_enabled") && duration != null
    val metadata =
      MediaMetadata.Builder()
        .setTitle(text("title"))
        .setArtist(text("artist"))
        .setAlbumTitle(text("album_title"))
        .setAlbumArtist(text("album_artist"))
        .setArtworkUri(text("thumbnail")?.let(Uri::parse))
        .build()
    val current =
      MediaItemData.Builder(CURRENT)
        .setMediaItem(MediaItem.Builder().setMediaId(CURRENT).setMediaMetadata(metadata).build())
        .setMediaMetadata(metadata)
        .setDurationUs(duration?.let { seconds -> (seconds * 1_000_000).toLong() } ?: C.TIME_UNSET)
        .setIsSeekable(seekable)
        .build()
    // Placeholders either side, so the system offers next and previous,
    // which a one-item playlist has nowhere to go to
    val playlist =
      listOfNotNull(
        MediaItemData.Builder("previous").build().takeIf { previous },
        current,
        MediaItemData.Builder("next").build().takeIf { next },
      )
    val commands =
      Player.Commands.Builder()
        .addAll(
          Player.COMMAND_PLAY_PAUSE,
          Player.COMMAND_STOP,
          Player.COMMAND_GET_CURRENT_MEDIA_ITEM,
          Player.COMMAND_GET_METADATA,
          Player.COMMAND_GET_TIMELINE,
        )
        .addIf(Player.COMMAND_SEEK_TO_NEXT, next)
        .addIf(Player.COMMAND_SEEK_TO_PREVIOUS, previous)
        .addIf(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM, seekable)
        .build()

    return State.Builder()
      .setAvailableCommands(commands)
      .setPlaylist(playlist)
      .setCurrentMediaItemIndex(if (previous) 1 else 0)
      .setPlaybackState(Player.STATE_READY)
      .setPlayWhenReady(status == "PLAYING", Player.PLAY_WHEN_READY_CHANGE_REASON_REMOTE)
      .setContentPositionMs(position)
      .setPlaybackParameters(PlaybackParameters(rate()))
      .build()
  }

  override fun handleSetPlayWhenReady(playWhenReady: Boolean): ListenableFuture<*> =
    send(if (playWhenReady) "PLAY" else "PAUSE")

  override fun handleStop(): ListenableFuture<*> = send("STOP")

  override fun handleSeek(mediaItemIndex: Int, positionMs: Long, seekCommand: Int): ListenableFuture<*> =
    when (seekCommand) {
      Player.COMMAND_SEEK_TO_NEXT, Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM -> send("NEXT")
      Player.COMMAND_SEEK_TO_PREVIOUS, Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM -> send("PREVIOUS")
      else -> send("SEEK", positionMs / 1000.0)
    }

  private fun send(action: String, position: Double? = null): ListenableFuture<*> {
    val request = JSONObject().put("action", action)

    if (position != null) request.put("position", position)
    control(request)

    return Futures.immediateVoidFuture()
  }

  /** A field's text, or null when it's missing, null or empty. */
  private fun text(name: String): String? =
    media?.takeUnless { data -> data.isNull(name) }?.optString(name)?.ifEmpty { null }

  /** Whether the computer allows an action, counting unknown as allowed. */
  private fun enabled(name: String): Boolean = media?.takeUnless { data -> data.isNull(name) }?.optBoolean(name) ?: true

  private fun rate(): Float = media?.optDouble("playback_rate", 1.0)?.toFloat()?.takeIf { speed -> speed > 0 } ?: 1f

  private companion object {
    const val CURRENT = "current"
  }
}
