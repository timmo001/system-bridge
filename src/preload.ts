// import { ipcRenderer, IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

declare global {
  interface Window {
    api: {
      ipcRendererOn: (
        channel: string,
        listener: (event: IpcRendererEvent, ...args: any[]) => void
      ) => void;
      ipcRendererSend: (channel: string, ...args: any[]) => void;
    };
  }
}

contextBridge.exposeInMainWorld("api", {
  ipcRendererOn: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void
  ) => ipcRenderer.on(channel, listener),
  ipcRendererSend: (channel: string, ...args: any[]): void =>
    ipcRenderer.send(channel, ...args),
});
