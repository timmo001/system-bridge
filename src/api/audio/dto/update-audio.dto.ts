export type UpdateAudioId =
  | "mute"
  | "pause"
  | "play"
  | "playpause"
  | "stop"
  | "volume"
  | "volumeDown"
  | "volumeUp";

export class UpdateAudioDto {
  value?: boolean | number;
}
