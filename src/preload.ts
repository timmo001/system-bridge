import {
  contextBridge,
  IpcRenderer,
  ipcRenderer,
  IpcRendererEvent,
} from "electron";

declare global {
  interface Window {
    api: {
      ipcRendererRemoveAllListeners: (channel: string) => void;
      ipcRendererOn: (
        channel: string,
        listener: (event: IpcRendererEvent, ...args: unknown[]) => void
      ) => void;
      ipcRendererSend: (channel: string, ...args: unknown[]) => void;
    };
  }
}

contextBridge.exposeInMainWorld("api", {
  ipcRendererRemoveAllListeners: (channel: string): IpcRenderer =>
    ipcRenderer.removeAllListeners(channel),
  ipcRendererOn: (
    channel: string,
    listener: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => ipcRenderer.on(channel, listener),
  ipcRendererSend: (channel: string, ...args: unknown[]): void =>
    ipcRenderer.send(channel, ...args),
});
