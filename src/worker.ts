import { parentPort, workerData } from "worker_threads";

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
import logger from "./logger";

function getService() {
  switch (workerData.name) {
    default:
      return new InformationService();
    case "audio":
      return new AudioService();
    case "battery":
      return new BatteryService();
    case "bluetooth":
      return new BluetoothService();
    case "cpu":
      return new CpuService();
    case "display":
      return new DisplayService();
    case "filesystem":
      return new FilesystemService();
    case "graphics":
      return new GraphicsService();
    case "memory":
      return new MemoryService();
    case "network":
      return new NetworkService();
    case "processes":
      return new ProcessesService();
    case "system":
      return new SystemService();
    case "usb":
      return new UsbService();
  }
}

logger.debug(`Worker - Run: ${workerData.name}`);

const service = getService();

(async () => {
  parentPort.postMessage(await service.findAll());
  parentPort.postMessage("done");
})();
