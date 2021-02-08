import { ipcMain } from "electron";

import { Configuration } from "./configuration";
import { getSettings } from "./utils";

class Main {
  private settings?: Configuration;

  constructor() {
    ipcMain.on("updated-setting", this.getSettings);

    this.getSettings();
    this.setupConnection();
  }

  private getSettings(): void {
    this.settings = getSettings();
  }

  private async setupConnection(): Promise<void> {
    console.log(this.settings);
  }
}

export default Main;
