import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";

import { Logger } from "./logger";
import { runService, WorkerData } from "./common";

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

  async setupJobs(): Promise<void> {
    this.scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        {
          milliseconds: this.interval,
          runImmediately: false,
        },
        this.createMainTask()
      )
    );
  }

  addJob(workerData: WorkerData): void {
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

  stop(): void {
    if (this.scheduler) this.scheduler.stop();
    this.scheduler = undefined;
    this.callback({ service: "status", method: "", data: 0 });
  }

  createMainTask(): AsyncTask {
    return new AsyncTask("main", async () => {
      const { logger } = new Logger("Observer");
      logger.info(
        `Run Jobs: ${this.jobs
          .map((job: WorkerData) => `${job.service} - ${job.method}`)
          .join(", ")}`
      );
      for (const workerData of this.jobs) {
        await this.createObserverTask(workerData);
      }
      logger.info("Done");
      logger.close();
    });
  }

  async createObserverTask(workerData: WorkerData): Promise<void> {
    let data: any;
    try {
      const d = await runService(workerData);
      if (JSON.stringify(data) !== JSON.stringify(d)) {
        data = d;
        this.callback({ ...workerData, data: d });
      }
    } catch (e) {
      const { logger } = new Logger("Observer");
      logger.error(`Service error for ${workerData.service}: ${e.message}`);
      logger.close();
    }
  }
}
