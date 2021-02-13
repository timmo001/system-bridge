import si, { Systeminformation } from "systeminformation";

export interface SystemInfo {
  baseboard: Systeminformation.BaseboardData;
  bios: Systeminformation.BiosData;
  chassis: Systeminformation.ChassisData;
  system: Systeminformation.SystemData;
  uuid: Systeminformation.UuidData;
}

export default class SystemInfoService {
  async find(): Promise<SystemInfo> {
    return {
      baseboard: await si.baseboard(),
      bios: await si.bios(),
      chassis: await si.chassis(),
      system: await si.system(),
      uuid: await si.uuid(),
    };
  }
}
