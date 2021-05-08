export interface CreateMediaDto {
  type: "audio" | "video";
  backgroundColor?: string;
  hidden?: boolean;
  opacity?: number;
  path?: string;
  transparent?: boolean;
  url?: string;
  volume?: number;
  x?: number;
  y?: number;
}
