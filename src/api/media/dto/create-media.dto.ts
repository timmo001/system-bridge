export type MediaType = "audio" | "video";

export interface CreateMediaDto {
  type: MediaType;
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
