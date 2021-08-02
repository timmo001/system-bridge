import { Systeminformation } from "systeminformation";

export interface Processes extends Systeminformation.ProcessesData {
  load: Systeminformation.CurrentLoadData;
}

export type Process = Systeminformation.ProcessesProcessData;
