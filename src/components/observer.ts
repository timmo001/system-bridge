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

  async startJob(workerData: WorkerData): void {
    this.scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        { milliseconds: this.interval },
        await this.createObserver(workerData)
      )
    );
  }

  stop(): void {
    if (this.scheduler) this.scheduler.stop();
    this.scheduler = undefined;
    this.callback({ status: { status: 0 } });
  }

  async createObserver(workerData: WorkerData): Promise<AsyncTask> {
    const { logger } = new Logger("Observer");

    let data: any;
    try {
      data = await runService(workerData);
    } catch (e) {
      logger.error(`Service error: ${e.message}`);
    }
    this.callback({ [name]: data });
    const task = new AsyncTask(workerData.service, async () => {
      try {
        const d = await runService(workerData);
        if (JSON.stringify(data) !== JSON.stringify(d)) {
          data = d;
          this.callback({ [workerData.service]: d });
        }
      } catch (e) {
        const { logger } = new Logger("Observer");
        logger.error(`Service error for ${workerData.service}: ${e.message}`);
        logger.close();
      }
    });
    logger.close();
    return task;
  }
}
