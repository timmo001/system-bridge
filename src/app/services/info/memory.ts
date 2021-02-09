import si, { Systeminformation } from "systeminformation";

export interface MemoryInfo extends Systeminformation.MemData {
  layout: Systeminformation.MemLayoutData[];
}

export default class MemoryInfoService {
  async find(): Promise<MemoryInfo> {
    return {
      ...(await si.mem()),
      layout: await si.memLayout(),
    };
  }
}
