export interface Source {
  type: "audio" | "video";
  source?: string;
  volumeInitial: number;
}

export interface AudioSource extends Source {
  type: "audio";
  album: string;
  artist: string;
  cover?: string;
  title: string;
}

export interface VideoSource extends Source {
  type: "video";
}

export interface Media {
  duration?: number;
  muted: boolean;
  playing: boolean;
  position?: number;
  source: AudioSource | VideoSource;
  volume: number;
}
