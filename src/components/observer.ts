import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";

import { Logger } from "./logger";
import { runService } from "./common";

const { logger } = new Logger("Observer");
export class Observer {
  private interval: number;
  private scheduler: ToadScheduler;

  public callback: (data: { [name: string]: any }) => void;

  constructor(settings: { [key: string]: string }) {
    this.interval =
      Number(settings["observer-interval"]) >= 20000
        ? Number(settings["observer-interval"])
        : 60000;
    this.scheduler = new ToadScheduler();
  }

  async start(): Promise<void> {
    this.callback({ status: { status: 1 } });

    const items = [
      "audio",
      "battery",
      "bluetooth",
      "cpu",
      "display",
      "filesystem",
      "graphics",
      "memory",
      "network",
      "processes",
      "system",
      "usb",
    ];

    for (const name of items)
      this.scheduler.addSimpleIntervalJob(
        new SimpleIntervalJob(
          { milliseconds: this.interval },
          await this.createObserver(name)
        )
      );
  }

  stop(): void {
    if (this.scheduler) this.scheduler.stop();
    this.scheduler = undefined;
    this.callback({ status: { status: 0 } });
  }

  async createObserver(name: string): Promise<AsyncTask> {
    let data: any;
    try {
      data = await runService({ name });
    } catch (e) {
      logger.error(`Service error: ${e.message}`);
    }
    this.callback({ [name]: data });
    const task = new AsyncTask(name, async () => {
      try {
        const d = await runService({ name });
        if (JSON.stringify(data) !== JSON.stringify(d)) {
          data = d;
          this.callback({ [name]: d });
        }
      } catch (e) {
        logger.error(`Service error for ${name}: ${e.message}`);
      }
    });
    logger.close();
    return task;
  }
}
