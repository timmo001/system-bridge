import { Sensor } from "system-bridge-windows-sensors";
import { Systeminformation } from "systeminformation";

export interface Graphics extends Systeminformation.GraphicsData {
  hardwareSensors?: Array<Sensor>;
}
