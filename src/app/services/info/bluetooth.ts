import si, { Systeminformation } from "systeminformation";

export default class BluetoothInfoService {
  async find(): Promise<Systeminformation.BluetoothDeviceData[]> {
    return await si.bluetoothDevices();
  }
}
