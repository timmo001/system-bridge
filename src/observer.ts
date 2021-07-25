import { observe as siObserve } from "systeminformation";
import axios, { AxiosResponse } from "axios";

import { getConnection, getSettingsObject } from "./common";
import { getCurrent } from "./audio/data";

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
      this.observe({ type: "audioData" }, timeout, () => callback("audio")),
      this.observe({ type: "systeminformation", key: "audio" }, timeout, () =>
        callback("audio")
      ),
      this.observe({ type: "systeminformation", key: "battery" }, timeout, () =>
        callback("battery")
      ),
      this.observe({ type: "systeminformation", key: "cpu" }, timeout, () =>
        callback("cpu")
      ),
      this.observe(
        { type: "systeminformation", key: "cpuCurrentSpeed" },
        timeout,
        () => callback("cpu")
      ),
      this.observe(
        { type: "systeminformation", key: "cpuTemperature" },
        timeout,
        () => callback("cpu")
      ),
      this.observe(
        { type: "systeminformation", key: "currentLoad" },
        timeout,
        () => callback("processes")
      ),
      this.observe({ type: "systeminformation", key: "fsSize" }, timeout, () =>
        callback("filesystem")
      ),
      this.observe({ type: "systeminformation", key: "mem" }, timeout, () =>
        callback("memory")
      ),
      this.observe(
        { type: "systeminformation", key: "memLayout" },
        timeout,
        () => callback("memory")
      ),
      this.observe(
        { type: "systeminformation", key: "networkStats" },
        timeout,
        () => callback("network")
      ),
      this.observe({ type: "systeminformation", key: "osInfo" }, timeout, () =>
        callback("os")
      ),
      this.observe(
        { type: "systeminformation", key: "processes" },
        timeout,
        () => callback("processes")
      ),
      this.observe({ type: "systeminformation", key: "system" }, timeout, () =>
        callback("system")
      ),
      this.observe({ type: "systeminformation", key: "users" }, timeout, () =>
        callback("os")
      ),
      this.observe(
        { type: "systeminformation", key: "wifiConnections" },
        timeout,
        () => callback("network")
      ),
      this.observe(
        { type: "systeminformation", key: "wifiNetworks" },
        timeout,
        () => callback("network")
      ),
    ];
  }

  cleanup(): void {
    this.observers.forEach((observer: number) => clearInterval(observer));
    this.observers = undefined;
  }

  observe(
    config: { type: "systeminformation" | "audioData" | string; key?: string },
    interval: number,
    cb: (item: string) => void
  ): number {
    switch (config.type) {
      case "audioData":
        this.observeAudioData(interval, cb);
      case "systeminformation":
        if (config.key) return siObserve({ [config.key]: "*" }, interval, cb);
      default:
        return -1;
    }
  }

  observeAudioData(interval: number, callback: (data: any) => void) {
    let audioData: { muted?: boolean; volume?: number };
    return setInterval(async () => {
      const data = await getCurrent();
      if (JSON.stringify(audioData) !== JSON.stringify(data)) {
        audioData = Object.assign({}, data);
        callback(data);
      }
    }, interval);
  }
}
