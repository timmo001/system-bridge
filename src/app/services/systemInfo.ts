import si, { Systeminformation } from "systeminformation";

export default class SystemInfoService {
  async find(): Promise<Systeminformation.SystemData> {
    return await si.system();
  }
}
