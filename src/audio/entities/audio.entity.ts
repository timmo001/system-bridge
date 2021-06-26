import { Systeminformation } from "systeminformation";

export class Audio {
  current?: { muted: boolean; volume: number };
  devices?: Systeminformation.AudioData[];
}
