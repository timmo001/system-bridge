import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";

import { Logger } from "./logger";
import { runService } from "./common";

export interface WorkerData {
  service: string;
  method: "findAll" | string;
}

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

  async startJob(data: WorkerData): void {
    this.scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        { milliseconds: this.interval },
        await this.createObserver(data)
      )
    );
  }

  stop(): void {
    if (this.scheduler) this.scheduler.stop();
    this.scheduler = undefined;
    this.callback({ status: { status: 0 } });
  }

  async createObserver(name: string): Promise<AsyncTask> {
    const { logger } = new Logger("Observer");

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
        const { logger } = new Logger("Observer");
        logger.error(`Service error for ${name}: ${e.message}`);
        logger.close();
      }
    });
    logger.close();
    return task;
  }
}
