import { observe } from "systeminformation";
import axios, { AxiosResponse } from "axios";

import { getConnection, getSettingsObject } from "./common";

export class Observer {
  private observers: Array<number>;

  async setup(
    settings: { [key: string]: string },
    cb: (data: { [key: string]: { [key: string]: any } }) => void
  ): Promise<void> {
    const timeout =
        Number(settings["observer-timeout"]) >= 5000
          ? Number(settings["observer-timeout"])
          : 30000,
      callback = async (name: string) => {
        const connection = await getConnection();
        const settings = await getSettingsObject(connection);
        await connection.close();

        const response: AxiosResponse<any> = await axios.get<any>(
          `http://localhost:${settings["network-apiPort"] || 9170}/${name}`,
          { headers: { "api-key": settings["network-apiKey"] } }
        );
        if (response.status === 200) cb({ [name]: response.data });
      };

    cb({ status: { status: 1 } });
    this.observers = [
      observe({ audio: "*" }, timeout, () => callback("audio")),
      observe({ battery: "*" }, timeout, () => callback("battery")),
      observe({ cpu: "*" }, timeout, () => callback("cpu")),
      observe({ cpuCurrentSpeed: "*" }, timeout, () => callback("cpu")),
      observe({ cpuTemperature: "*" }, timeout, () => callback("cpu")),
      observe({ currentLoad: "*" }, timeout, () => callback("processes")),
      observe({ fsSize: "*" }, timeout, () => callback("filesystem")),
      observe({ mem: "*" }, timeout, () => callback("memory")),
      observe({ memLayout: "*" }, timeout, () => callback("memory")),
      observe({ networkStats: "*" }, timeout, () => callback("network")),
      observe({ osInfo: "*" }, timeout, () => callback("os")),
      observe({ processes: "*" }, timeout, () => callback("processes")),
      observe({ system: "*" }, timeout, () => callback("system")),
      observe({ users: "*" }, timeout, () => callback("os")),
      observe({ wifiConnections: "*" }, timeout, () => callback("network")),
      observe({ wifiNetworks: "*" }, timeout, () => callback("network")),
    ];
  }

  cleanup(): void {
    this.observers.forEach((observer: number) => clearInterval(observer));
    this.observers = undefined;
  }
}
