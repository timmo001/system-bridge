import { Systeminformation } from "systeminformation";

export interface Processes extends Systeminformation.ProcessesData {
  load: Systeminformation.CurrentLoadData;
}
