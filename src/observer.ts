import { runService } from "./common";

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

    this.observers = [
      this.observer("audio", interval, callback),
      this.observer("battery", interval, callback),
      this.observer("bluetooth", interval, callback),
      this.observer("cpu", interval, callback),
      this.observer("display", interval, callback),
      this.observer("filesystem", interval, callback),
      this.observer("graphics", interval, callback),
      this.observer("memory", interval, callback),
      this.observer("network", interval, callback),
      this.observer("processes", interval, callback),
      this.observer("system", interval, callback),
      this.observer("usb", interval, callback),
    ];
  }

  cleanup(): void {
    this.observers.forEach((observer: NodeJS.Timer) => clearInterval(observer));
    this.observers = undefined;
  }

  observer(
    name: string,
    interval: number,
    callback: (name: string, data: any) => void
  ): NodeJS.Timer {
    let data: any;
    return setInterval(async () => {
      const d = await runService({ name });
      if (JSON.stringify(data) !== JSON.stringify(d)) {
        data = d;
        callback(name, d);
      }
    }, interval);
  }
}
