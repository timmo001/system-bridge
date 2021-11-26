import { parentPort, workerData } from "worker_threads";

(async () => {
  const service = new (
    await import(`./api/${workerData.service}/${workerData.service}.service`)
  )[
    `${
      workerData.service.charAt(0).toUpperCase() + workerData.service.slice(1)
    }Service`
  ]();
  parentPort.postMessage(await service[workerData.method]());
  parentPort.postMessage("done");
})();
