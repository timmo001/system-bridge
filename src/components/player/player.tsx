"use client";
import React, {
  ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { cloneDeep, isEqual } from "lodash";

import { type WebSocketResponse } from "@/types/websocket";
import { PlayerStatus, usePlayer } from "./utils";
import { usePrevious } from "@/utils";
import { WebSocketConnection } from "@/utils/websocket";
import AudioComponent from "./audio";
import VideoComponent from "./video";

interface PlayerProps {
  playerType: "audio" | "video";
}

let ws: WebSocketConnection;

function PlayerComponent({ playerType }: PlayerProps): ReactElement {
  const [setup, setSetup] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = usePlayer();
  const previousPlayerStatus = usePrevious(playerStatus);

  const searchParams = useSearchParams();

  const eventHandler = useCallback(
    (event: any) => {
      // WebSocketResponse
      console.log("Event:", event);
      switch (event.type) {
        case "MEDIA_PAUSE":
          setPlayerStatus({ ...playerStatus!!, playing: false });
          break;
        case "MEDIA_PLAY":
          setPlayerStatus({ ...playerStatus!!, playing: true });
          break;
        case "MEDIA_VOLUME_DOWN":
          if (event.volume)
            setPlayerStatus({
              ...playerStatus!!,
              volume: playerStatus!!.volume - event.volume,
            });
          break;
        case "MEDIA_VOLUME_UP":
          if (event.volume)
            setPlayerStatus({
              ...playerStatus!!,
              volume: playerStatus!!.volume + event.volume,
            });
          break;
        case "MEDIA_VOLUME_SET":
          if (event.volume)
            setPlayerStatus({ ...playerStatus!!, volume: event.volume });
          break;
        case "MEDIA_VOLUME_SET":
          if (event.position)
            setPlayerStatus({ ...playerStatus!!, position: event.position });
          break;
        default:
          break;
      }
    },
    [playerStatus, setPlayerStatus]
  );

  const handleSetup = useCallback(
    (host: string, port: number, token: string) => {
      console.log("Setup WebSocketConnection");
      ws = new WebSocketConnection(host, port, token, async () => {
        ws.getSettings();
      });
      ws.onEvent = (e: Event) => eventHandler(e as WebSocketResponse);
    },
    [eventHandler]
  );

  useEffect(() => {
    if (!setup && searchParams) {
      const apiHost = searchParams.get("apiHost");
      const apiPort = searchParams.get("apiPort");
      const token = searchParams.get("token");

      console.log({ apiHost, apiPort, token });

      if (apiHost && apiPort && token) {
        setSetup(true);
        handleSetup(apiHost, Number(apiPort), token);
      }
    }
  }, [setup, handleSetup, searchParams]);

  useEffect(() => {
    if (!playerStatus && searchParams) {
      const autoplay: boolean =
        searchParams.get("autoplay")?.toLowerCase() === "true";
      const volumeString = searchParams.get("volume");
      const volume: number = volumeString ? parseInt(volumeString) : 40;
      const sourceParams = {
        url: searchParams.get("url"),
        album: searchParams.get("album"),
        artist: searchParams.get("artist"),
        cover: searchParams.get("cover"),
        title: searchParams.get("title"),
      };
      switch (playerType) {
        default:
          break;
        case "audio":
          setPlayerStatus({
            autoplay,
            muted: false,
            playing: false,
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "audio",
              source: sourceParams.url ?? "",
              album: sourceParams.album || "Unknown Album",
              artist: sourceParams.artist || "Unknown Aritst",
              cover: sourceParams.cover ?? "",
              title: sourceParams.title || "Unknown Title",
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
        case "video":
          setPlayerStatus({
            autoplay: autoplay,
            muted: false,
            playing: false,
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "video",
              source: sourceParams.url ?? "",
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
      }
    }
  }, [playerStatus, setPlayerStatus, playerType]);

  useEffect(() => {
    if (playerStatus) {
      let previousStatus;
      if (previousPlayerStatus) {
        previousStatus = cloneDeep(previousPlayerStatus) as PlayerStatus;
        if (previousStatus.source.type === "audio")
          delete previousStatus.source.cover;
      }
      let newStatus = cloneDeep(playerStatus);
      if (newStatus.source.type === "audio") delete newStatus.source.cover;
      if (!isEqual(newStatus, previousStatus)) {
        console.log(
          "Player update\n\npreviousStatus:",
          previousStatus,
          "\nnewStatus:",
          newStatus
        );
        if (!newStatus.loaded) return;
        if (!ws) return;
        if (!ws.isConnected()) {
          setSetup(false);
          console.warn("WebSocket not connected");
          return;
        }
        ws.sendPlayerStatus(newStatus);
      }
    }
  }, [playerStatus, previousPlayerStatus]);

  const type = useMemo<string | undefined>(() => {
    if (!playerStatus) return undefined;
    const status = playerStatus as PlayerStatus;
    return status.source.type;
  }, [playerStatus]);

  return (
    <>
      {type === "audio" ? (
        <AudioComponent />
      ) : type === "video" ? (
        <VideoComponent />
      ) : (
        ""
      )}
    </>
  );
}

function PlayerComponentContainer(): ReactElement {
  const searchParams = useSearchParams();
  const playerType = searchParams.get("type") as "audio" | "video";

  return (
    <Suspense>
      <PlayerComponent playerType={playerType} />
    </Suspense>
  );
}

export default PlayerComponentContainer;
