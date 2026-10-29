import type { MediaData } from "@timmo001/effect-system-bridge";

/** What the Media page shows of the media data or a picked player. */
export type ShownMedia = Pick<
  MediaData,
  | "player"
  | "type"
  | "status"
  | "title"
  | "artist"
  | "album_title"
  | "thumbnail"
  | "position"
  | "duration"
  | "updated_at"
  | "volume"
  | "shuffle"
  | "repeat"
  | "track_number"
  | "playback_rate"
  | "is_play_enabled"
  | "is_pause_enabled"
  | "is_stop_enabled"
  | "is_next_enabled"
  | "is_previous_enabled"
  | "is_seek_enabled"
>;

/** The picked player's details, or the backend's pick when it's gone. */
export const shownMedia = (
  media: MediaData,
  chosen: string | null,
): ShownMedia => {
  const player = media.players.find((entry) => entry.id === chosen);

  if (player === undefined) return media;

  return {
    player: player.id,
    type: player.name,
    status: player.status,
    title: player.title || null,
    artist: player.artist,
    album_title: player.album_title,
    thumbnail: player.thumbnail,
    position: player.position,
    duration: player.duration,
    updated_at: media.updated_at,
    volume: player.volume,
    shuffle: player.shuffle,
    repeat: player.repeat,
    track_number: player.track_number,
    playback_rate: player.playback_rate,
    is_play_enabled: player.is_play_enabled,
    is_pause_enabled: player.is_pause_enabled,
    is_stop_enabled: player.is_stop_enabled,
    is_next_enabled: player.is_next_enabled,
    is_previous_enabled: player.is_previous_enabled,
    is_seek_enabled: player.is_seek_enabled,
  };
};
