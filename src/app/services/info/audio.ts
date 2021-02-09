import si, { Systeminformation } from "systeminformation";

export default class AudioInfoService {
  async find(): Promise<Systeminformation.AudioData[]> {
    return await si.audio();
  }
}
