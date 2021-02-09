import si, { Systeminformation } from "systeminformation";

export default class BatteryInfoService {
  async find(): Promise<Systeminformation.BatteryData> {
    return await si.battery();
  }
}
