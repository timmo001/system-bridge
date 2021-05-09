export declare global {
  interface Window {
    api: {
      ipcRendererRemoveAllListeners: (channel: string) => void;
      ipcRendererOn: (
        channel: string,
        listener: (event: IpcRendererEvent, ...args: any[]) => void
      ) => void;
      ipcRendererSend: (channel: string, ...args: any[]) => void;
    };
  }
}
