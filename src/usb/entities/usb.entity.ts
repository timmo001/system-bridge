import { Systeminformation } from "systeminformation";

export interface Usb {
  devices: Array<Systeminformation.UsbData>;
}
