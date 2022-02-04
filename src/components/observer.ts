import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";

import { Logger } from "./logger";
import { runService, WorkerData } from "./common";
import { loggers } from "winston";

export interface ObserverData extends WorkerData {
  data: any;
}

export class Observer {
  private interval: number;
  private scheduler: ToadScheduler;
  private jobs: Array<WorkerData> = [];

  public callback: (data: ObserverData) => void;

  constructor(settings: { [key: string]: string }) {
    this.interval =
      Number(settings["observer-interval"]) >= 20000
        ? Number(settings["observer-interval"])
        : 60000;
    this.scheduler = new ToadScheduler();
  }

  async addJob(workerData: WorkerData): Promise<void> {
    if (
      this.jobs.findIndex(
        (job: WorkerData) =>
          job.service === workerData.service && job.method === workerData.method
      ) === -1
    ) {
      const { logger } = new Logger("Observer");
      logger.info(`Add job ${workerData.service} - ${workerData.method}`);
      logger.close();

      this.jobs.push(workerData);
    }
  }

  async start(): Promise<void> {
    this.scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        { milliseconds: this.interval },
        await this.createObserverTask()
      )
    );
  }

  stop(): void {
    if (this.scheduler) this.scheduler.stop();
    this.scheduler = undefined;
    this.callback({ service: "status", method: "", data: 0 });
  }

  async createObserverTask(): Promise<AsyncTask> {
    let data: any;
    return new AsyncTask("observer", async () => {
      for (const job of this.jobs) {
        const { logger } = new Logger("Observer");
        logger.info(`Run Job: ${job.service} - ${job.method}`);
        logger.close();
        try {
          const d = await runService(job);
          if (JSON.stringify(data) !== JSON.stringify(d)) {
            data = d;
            this.callback({ ...job, data: d });
          }
        } catch (e) {
          const { logger } = new Logger("Observer");
          logger.error(
            `Service error for ${job.service} - ${job.method}: ${e.message}`
          );
          logger.close();
        }
      }
    });
  }
}
