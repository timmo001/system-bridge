import { Systeminformation } from "systeminformation";

export interface Memory extends Systeminformation.MemData {
  layout: Systeminformation.MemLayoutData[];
}
