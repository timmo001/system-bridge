"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SystemBridgeConnectionState {
  host: string;
  port: number;
  ssl: boolean;
  token: string | null;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setSsl: (ssl: boolean) => void;
  setToken: (token: string | null) => void;
}

export const useSystemBridgeConnectionStore =
  create<SystemBridgeConnectionState>()(
    persist(
      (set) => ({
        host: "localhost",
        port: 9170,
        ssl: false,
        token: null,
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
