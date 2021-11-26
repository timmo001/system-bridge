import { Systeminformation } from "systeminformation";

export class AudioCurrent {
  muted?: boolean;
  volume?: number;
}

export class Audio {
  current?: AudioCurrent;
  devices?: Array<Systeminformation.AudioData>;
}
