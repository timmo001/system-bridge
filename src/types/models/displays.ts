export interface Display {
  name: string;
  resolution_horizontal: number;
  resolution_vertical: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  is_primary?: boolean;
  pixel_clock?: number;
  refresh_rate?: number;
}

export type Displays = Display[];
