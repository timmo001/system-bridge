"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SystemBridgeConnectionState {
  host: string;
  port: number;
  ssl: boolean;
  token: string | null;
  setAll: (state: {
    host: string;
    port: number;
    ssl: boolean;
    token: string | null;
  }) => Promise<void>;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setSsl: (ssl: boolean) => void;
  setToken: (token: string | null) => void;
}

export const useSystemBridgeConnectionStore = create<SystemBridgeConnectionState>()(
  persist(
    (set) => ({
      host: "0.0.0.0",
      port: 9170,
      ssl: false,
      token: null,
      setAll: async ({
        host,
        port,
        ssl,
        token,
      }: {
        host: string;
        port: number;
        ssl: boolean;
        token: string | null;
      }) => {
        set({ host, port, ssl, token });
        return Promise.resolve();
      },
      setHost: (host: string) => set({ host }),
      setPort: (port: number) => set({ port }),
      setSsl: (ssl: boolean) => set({ ssl }),
      setToken: (token: string | null) => set({ token }),
    }),
    {
      name: "system-bridge-connection",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
