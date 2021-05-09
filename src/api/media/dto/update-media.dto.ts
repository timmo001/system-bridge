export type UpdateMediaId =
  | "pause"
  | "play"
  | "playpause"
  | "stop"
  | "mute"
  | "volume"
  | "volumeDown"
  | "volumeUp";

export class UpdateMediaDto {
  value?: boolean | number;
}
