import si, { Systeminformation } from "systeminformation";

export default class GraphicsInfoService {
  async find(): Promise<Systeminformation.GraphicsData> {
    return await si.graphics();
  }
}
