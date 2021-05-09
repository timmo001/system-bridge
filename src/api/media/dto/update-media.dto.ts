export type UpdateMediaId =
  | "mute"
  | "pause"
  | "play"
  | "playpause"
  | "seek"
  | "stop"
  | "volume"
  | "volumeDown"
  | "volumeUp";

export class UpdateMediaDto {
  value?: boolean | number;
}
