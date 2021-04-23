// import { ipcRenderer, IpcRendererEvent } from "electron";
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

declare global {
  interface Window {
    api: {
      ipcRendererOn: (
        channel: string,
        listener: (event: IpcRendererEvent, ...args: unknown[]) => void
      ) => void;
      ipcRendererSend: (channel: string, ...args: unknown[]) => void;
    };
  }
}

contextBridge.exposeInMainWorld("api", {
  ipcRendererOn: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => ipcRenderer.on(channel, listener),
  ipcRendererSend: (channel: string, ...args: unknown[]): void =>
    ipcRenderer.send(channel, ...args),
});
