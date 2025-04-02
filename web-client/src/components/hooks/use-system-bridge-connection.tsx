"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SystemBridgeConnectionState {
  host: string;
  port: number;
  ssl: boolean;
  setHost: (host: string) => void;
  setPort: (port: number) => void;
  setSsl: (ssl: boolean) => void;
}

export const useSystemBridgeConnectionStore =
  create<SystemBridgeConnectionState>()(
    persist(
      (set) => ({
        host: "localhost",
        port: 9170,
        ssl: false,
        setHost: (host: string) => set({ host }),
        setPort: (port: number) => set({ port }),
        setSsl: (ssl: boolean) => set({ ssl }),
      }),
      {
        name: "system-bridge-connection",
        storage: createJSONStorage(() => localStorage),
      },
    ),
  );
