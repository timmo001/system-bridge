import { Systeminformation } from "systeminformation";

export interface Memory extends Systeminformation.MemData {
  layout: Array<Systeminformation.MemLayoutData>;
}
