import { createContext } from "@lit/context";

export interface ConnectionStatus {
  isConnected: boolean;
  error: string | null;
  retryConnection: () => void;
}

export const connectionStatusContext =
  createContext<ConnectionStatus>("connection-status");
