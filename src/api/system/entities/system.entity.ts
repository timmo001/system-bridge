import { Systeminformation } from "systeminformation";

export interface System {
  baseboard: Systeminformation.BaseboardData;
  bios: Systeminformation.BiosData;
  chassis: Systeminformation.ChassisData;
  system: Systeminformation.SystemData;
  uuid: Systeminformation.UuidData;
}
