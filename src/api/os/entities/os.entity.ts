import { Systeminformation } from "systeminformation";

export interface Os extends Systeminformation.OsData {
  idleTime: number;
  users: Systeminformation.UserData[];
}
