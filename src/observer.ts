import { observe } from "systeminformation";

export class Observer {
  private observers: Array<number>;

  async setup(
    settings: { [key: string]: string },
    cb: (data: { [key: string]: { [key: string]: any } }) => void
  ): Promise<void> {
    const timeout =
        Number(settings["observer-timeout"]) >= 5000
          ? Number(settings["observer-timeout"])
          : 20000,
      callback = (data: { [key: string]: { [key: string]: any } }) => cb(data);

    callback({ status: { status: 1 } });
    this.observers = [
      observe({ audio: "*" }, timeout, callback),
      observe({ battery: "*" }, timeout, callback),
      observe({ cpu: "*" }, timeout, callback),
      observe({ cpuCurrentSpeed: "*" }, timeout, callback),
      observe({ cpuTemperature: "*" }, timeout, callback),
      observe({ currentLoad: "*" }, timeout, callback),
      observe({ fsSize: "*" }, timeout, callback),
      observe({ mem: "*" }, timeout, callback),
      observe({ memLayout: "*" }, timeout, callback),
      observe({ networkStats: "*" }, timeout, callback),
      observe({ osInfo: "*" }, timeout, callback),
      observe({ processes: "*" }, timeout, callback),
      observe({ system: "*" }, timeout, callback),
      observe({ users: "*" }, timeout, callback),
      observe({ wifiConnections: "*" }, timeout, callback),
      observe({ wifiNetworks: "*" }, timeout, callback),
    ];
  }

  cleanup(): void {
    this.observers.forEach((observer: number) => clearInterval(observer));
    this.observers = undefined;
  }
}
