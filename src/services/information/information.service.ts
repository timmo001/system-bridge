// Initializes the `system` service on path `/system`
import { ServiceAddons } from "@feathersjs/feathers";

import { Application } from "../../declarations";
import { Information } from "./information.class";
import AudioInfoService from "./audio.class";
import BatteryInfoService from "./battery.class";
import BluetoothInfoService from "./bluetooth.class";
import CpuInfoService from "./cpu.class";
import FilesystemInfoService from "./filesystem.class";
import GraphicsInfoService from "./graphics.class";
import MemoryInfoService from "./memory.class";
import NetworkInfoService from "./network.class";
import OsInfoService from "./os.class";
import SystemInfoService from "./system.class";
import hooks from "./information.hooks";

// Add this service to the service type index
declare module "../../declarations" {
  interface ServiceTypes {
    information: SystemInfoService & ServiceAddons<unknown>;
    // information: {
    //   audio: AudioInfoService & ServiceAddons<unknown>;
    //   battery: BatteryInfoService & ServiceAddons<unknown>;
    //   bluetooth: BluetoothInfoService & ServiceAddons<unknown>;
    //   cpu: CpuInfoService & ServiceAddons<unknown>;
    //   filesystem: FilesystemInfoService & ServiceAddons<unknown>;
    //   graphics: GraphicsInfoService & ServiceAddons<unknown>;
    //   memory: MemoryInfoService & ServiceAddons<unknown>;
    //   network: NetworkInfoService & ServiceAddons<unknown>;
    //   os: OsInfoService & ServiceAddons<unknown>;
    //   system: SystemInfoService & ServiceAddons<unknown>;
    // };
  }
}

export default function (app: Application): void {
  // Initialize our service with any options it requires
  app.use("/information", new Information({}, app));
  app.use("/information/audio", new AudioInfoService());
  app.use("/information/battery", new BatteryInfoService());
  app.use("/information/bluetooth", new BluetoothInfoService());
  app.use("/information/cpu", new CpuInfoService());
  app.use("/information/filesystem", new FilesystemInfoService());
  app.use("/information/graphics", new GraphicsInfoService());
  app.use("/information/memory", new MemoryInfoService());
  app.use("/information/network", new NetworkInfoService());
  app.use("/information/os", new OsInfoService());
  app.use("/information/system", new SystemInfoService());

  // Get our initialized service so that we can register hooks
  const service = app.service("information");

  service.hooks(hooks);
}
