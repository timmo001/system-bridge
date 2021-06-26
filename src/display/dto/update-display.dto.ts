export type UpdateDisplayId = "brightness" | "brightnessDown" | "brightnessUp";

export class UpdateDisplayDto {
  value?: boolean | number;
}
