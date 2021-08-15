import { runService } from "./common";

export class Observer {
  private observers: Array<NodeJS.Timer>;

  async setup(
    settings: { [key: string]: string },
    cb: (data: { [key: string]: { [key: string]: any } }) => void
  ): Promise<void> {
    const interval =
        Number(settings["observer-interval"]) >= 20000
          ? Number(settings["observer-interval"])
          : 60000,
      callback = (name: string, data: any) => cb({ [name]: data });

    cb({ status: { status: 1 } });

    this.observers = [
      await this.observer("audio", interval, callback),
      await this.observer("battery", interval, callback),
      await this.observer("bluetooth", interval, callback),
      await this.observer("cpu", interval, callback),
      await this.observer("display", interval, callback),
      await this.observer("filesystem", interval, callback),
      await this.observer("graphics", interval, callback),
      await this.observer("memory", interval, callback),
      await this.observer("network", interval, callback),
      await this.observer("processes", interval, callback),
      await this.observer("system", interval, callback),
      await this.observer("usb", interval, callback),
    ];
  }

  cleanup(): void {
    if (this.observers && this.observers.length > 0)
      this.observers.forEach((observer: NodeJS.Timer) =>
        clearInterval(observer)
      );
    this.observers = undefined;
  }

  async observer(
    name: string,
    interval: number,
    callback: (name: string, data: any) => void
  ): Promise<NodeJS.Timer> {
    let data = await runService({ name });
    callback(name, data);
    return setInterval(async () => {
      const d = await runService({ name });
      if (JSON.stringify(data) !== JSON.stringify(d)) {
        data = d;
        callback(name, d);
      }
    }, interval);
  }
}
