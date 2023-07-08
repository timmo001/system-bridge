import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/dist/client/router";
import { cloneDeep, isEqual } from "lodash";

import { Event } from "assets/entities/event.entity";
import { PlayerStatus, usePlayer } from "./Utils";
import { usePrevious } from "../Common/Utils";
import { WebSocketConnection } from "components/Common/WebSocket";
import AudioComponent from "./Audio";
import VideoComponent from "./Video";

interface PlayerProps {
  playerType: "audio" | "video";
}

let websocket: WebSocketConnection;
function PlayerComponent({ playerType }: PlayerProps): ReactElement {
  const [webSocketSetup, setWebSocketSetup] = useState<boolean>(false);
  const [playerStatus, setPlayerStatus] = usePlayer();
  const previousPlayerStatus = usePrevious(playerStatus);

  const router = useRouter();
  const query = router.query as NodeJS.Dict<string>;

  const eventHandler = useCallback(
    (event: Event) => {
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
    [playerStatus, setPlayerStatus],
  );

  const handleSetupWebSocket = useCallback(
    (port: number, apiKey: string) => {
      console.log("Setup WebSocketConnection");
      websocket = new WebSocketConnection(port, apiKey, async () => {
        console.log("Connected to WebSocket");
      });
      websocket.onEvent = eventHandler;
    },
    [eventHandler],
  );

  useEffect(() => {
    if (!webSocketSetup && query && query.apiKey) {
      setWebSocketSetup(true);
      handleSetupWebSocket(Number(query.apiPort) || 9170, String(query.apiKey));
    }
  }, [webSocketSetup, handleSetupWebSocket, query]);

  useEffect(() => {
    if (!playerStatus && router.isReady) {
      const volume = Number(query.volume);
      switch (playerType) {
        default:
          break;
        case "audio":
          setPlayerStatus({
            autoplay: query.autoplay?.toLowerCase() === "true",
            muted: false,
            playing: false,
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "audio",
              source: query.url,
              album: query.album || "Unknown Album",
              artist: query.artist || "Unknown Aritst",
              cover: query.cover,
              title: query.title || "Unknown Title",
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
        case "video":
          setPlayerStatus({
            autoplay: query.autoplay?.toLowerCase() === "true",
            muted: false,
            playing: false,
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "video",
              source: String(query.url),
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
      }
    }
  }, [playerStatus, setPlayerStatus, playerType, router, query]);

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
          newStatus,
        );
        if (!newStatus.loaded) return;
        if (!websocket) return;
        if (!websocket.isConnected()) {
          setWebSocketSetup(false);
          console.warn("WebSocket not connected");
          return;
        }
        websocket.sendPlayerStatus(newStatus);
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

export default PlayerComponent;
