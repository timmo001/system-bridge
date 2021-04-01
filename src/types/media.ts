export interface MediaCreateData {
  backgroundColor?: string;
  hidden?: boolean;
  opacity?: number;
  path?: string;
  transparent?: boolean;
  type: "audio" | "video";
  url?: string;
  volume?: number;
  x?: number;
  y?: number;
}
