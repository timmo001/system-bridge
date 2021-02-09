import si from "systeminformation";

export default class BluetoothInfoService {
  // BUSTED: async find(): Promise<Systeminformation.BluetoothDeviceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async find(): Promise<any> {
    return await si.bluetoothDevices();
  }
}
