import { Systeminformation } from "systeminformation";

export interface Os extends Systeminformation.OsData {
  users: Systeminformation.UserData[];
}
