import { AudioService } from "./api/audio/audio.service";
import { BatteryService } from "./api/battery/battery.service";
import { BluetoothService } from "./api/bluetooth/bluetooth.service";
import { CpuService } from "./api/cpu/cpu.service";
import { DisplayService } from "./api/display/display.service";
import { FilesystemService } from "./api/filesystem/filesystem.service";
import { GraphicsService } from "./api/graphics/graphics.service";
import { InformationService } from "./api/information/information.service";
import { MemoryService } from "./api/memory/memory.service";
import { NetworkService } from "./api/network/network.service";
import { ProcessesService } from "./api/processes/processes.service";
import { SystemService } from "./api/system/system.service";
import { UsbService } from "./api/usb/usb.service";

export class Observer {
  private observers: Array<NodeJS.Timer>;

  async setup(
    settings: { [key: string]: string },
    cb: (data: { [key: string]: { [key: string]: any } }) => void
  ): Promise<void> {
    const interval =
        Number(settings["observer-interval"]) >= 5000
          ? Number(settings["observer-interval"])
          : 30000,
      callback = (name: string, data: any) => cb({ [name]: data });

    cb({ status: { status: 1 } });

    const audioService = new AudioService();
    const batteryService = new BatteryService();
    const bluetoothService = new BluetoothService();
    const cpuService = new CpuService();
    const displayService = new DisplayService();
    const filesystemService = new FilesystemService();
    const graphicsService = new GraphicsService();
    const informationService = new InformationService();
    const memoryService = new MemoryService();
    const networkService = new NetworkService();
    const processesService = new ProcessesService();
    const systemService = new SystemService();
    const usbService = new UsbService();

    this.observers = [
      this.customObserver("audio", audioService.findAll, interval, callback),
      this.customObserver(
        "battery",
        batteryService.findAll,
        interval,
        callback
      ),
      this.customObserver(
        "bluetooth",
        bluetoothService.findAll,
        interval,
        callback
      ),
      this.customObserver("cpu", cpuService.findAll, interval, callback),
      this.customObserver(
        "display",
        displayService.findAll,
        interval,
        callback
      ),
      this.customObserver(
        "filesystem",
        filesystemService.findAll,
        interval,
        callback
      ),
      this.customObserver(
        "graphics",
        graphicsService.findAll,
        interval,
        callback
      ),
      this.customObserver(
        "information",
        informationService.findAll,
        interval,
        callback
      ),
      this.customObserver("memory", memoryService.findAll, interval, callback),
      this.customObserver(
        "network",
        networkService.findAll,
        interval,
        callback
      ),
      this.customObserver(
        "processes",
        processesService.findAll,
        interval,
        callback
      ),
      this.customObserver("system", systemService.findAll, interval, callback),
      this.customObserver("usb", usbService.findAll, interval, callback),
    ];
  }

  cleanup(): void {
    this.observers.forEach((observer: NodeJS.Timer) => clearInterval(observer));
    this.observers = undefined;
  }

  customObserver(
    name: string,
    func: () => Promise<any>,
    interval: number,
    callback: (name: string, data: any) => void
  ): NodeJS.Timer {
    let data: any;
    return setInterval(async () => {
      const d = await func();
      if (JSON.stringify(data) !== JSON.stringify(d)) {
        data = d;
        callback(name, d);
      }
    }, interval);
  }
}
