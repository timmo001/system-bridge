export type UpdateAudioId = "mute" | "volume" | "volumeDown" | "volumeUp";

export class UpdateAudioDto {
  value?: boolean | number;
}
