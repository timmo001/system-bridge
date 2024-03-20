export interface Media {
  album_artist?: string;
  album_title?: string;
  artist?: string;
  duration?: number;
  is_fast_forward_enabled?: boolean;
  is_next_enabled?: boolean;
  is_pause_enabled?: boolean;
  is_play_enabled?: boolean;
  is_previous_enabled?: boolean;
  is_rewind_enabled?: boolean;
  is_stop_enabled?: boolean;
  playback_rate?: number;
  position?: number;
  repeat?: string;
  shuffle?: boolean;
  status?: string;
  subtitle?: string;
  thumbnail?: string;
  title?: string;
  track_number?: number;
  type?: string;
  updated_at?: number;
}
