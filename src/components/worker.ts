import { parentPort, workerData } from "worker_threads";

async function getService(): Promise<any> {
  switch (workerData.name) {
    default:
      return undefined;
    case "audio":
      return new (await import("./api/audio/audio.service")).AudioService();
    case "battery":
      return new (
        await import("./api/battery/battery.service")
      ).BatteryService();
    case "bluetooth":
      return new (
        await import("./api/bluetooth/bluetooth.service")
      ).BluetoothService();
    case "cpu":
      return new (await import("./api/cpu/cpu.service")).CpuService();
    case "display":
      return new (
        await import("./api/display/display.service")
      ).DisplayService();
    case "filesystem":
      return new (
        await import("./api/filesystem/filesystem.service")
      ).FilesystemService();
    case "graphics":
      return new (
        await import("./api/graphics/graphics.service")
      ).GraphicsService();
    case "information":
      return new (
        await import("./api/information/information.service")
      ).InformationService();
    case "logs":
      return new (await import("./api/logs/logs.service")).LogsService();
    case "memory":
      return new (await import("./api/memory/memory.service")).MemoryService();
    case "network":
      return new (
        await import("./api/network/network.service")
      ).NetworkService();
    case "os":
      return new (await import("./api/os/os.service")).OsService();
    case "processes":
      return new (
        await import("./api/processes/processes.service")
      ).ProcessesService();
    case "system":
      return new (await import("./api/system/system.service")).SystemService();
    case "usb":
      return new (await import("./api/usb/usb.service")).UsbService();
  }
}

(async () => {
  const service = await getService();
  parentPort.postMessage(await service.findAll());
  parentPort.postMessage("done");
})();
