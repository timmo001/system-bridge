import { Service } from "mdns";

import { Logger } from "../logger";

export class MDNSBrowser {
  services: Array<Service> = [];
  servicesUpdated: (services: Array<Service>) => void;

  constructor(callback: (services: Array<Service>) => void) {
    this.servicesUpdated = callback;
  }

  async startBrowser() {
    try {
      const MDNS = await import("mdns");
      const browser = MDNS.createBrowser(MDNS.udp("system-bridge"));
      browser.on("serviceUp", this.serviceUp);
      browser.on("serviceDown", this.serviceDown);
      browser.start();
    } catch (error) {
      const { logger } = new Logger("MDNSBrowser");
      logger.warn(`MDNS error caught: ${error.message}`);
      logger.close();
    }
  }

  serviceUp = (service: Service) => {
    const index = this.services.findIndex((s) => s.name === service.name);
    if (index > -1) this.services.splice(index);
    this.services.push(service);
    this.servicesUpdated(this.services);
  };

  serviceDown = (service: Service) => {
    const index = this.services.findIndex((s) => s.name === service.name);
    if (index > -1) this.services.splice(index);
    this.servicesUpdated(this.services);
  };
}
