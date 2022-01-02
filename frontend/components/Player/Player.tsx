import React, { ReactElement, useEffect, useMemo } from "react";
import { useRouter } from "next/dist/client/router";
import { cloneDeep, isEqual } from "lodash";

import { PlayerStatus, usePlayer } from "./Utils";
import { usePrevious } from "../Common/Utils";
import { useSettings } from "../Contexts/Settings";
import AudioComponent from "./Audio";
import logo from "assets/media/system-bridge.svg";
import VideoComponent from "./Video";

interface PlayerProps {
  playerType: "audio" | "video";
  entered?: boolean;
}

function PlayerComponent({ playerType, entered }: PlayerProps): ReactElement {
  const [settings] = useSettings();
  const [playerStatus, setPlayerStatus] = usePlayer();
  const previousPlayerStatus = usePrevious(playerStatus);

  const query = useRouter().query;

  useEffect(() => {
    if (settings && !playerStatus) {
      console.log(query);
      const volume = Number(query.volume);
      switch (playerType) {
        default:
          break;
        case "audio":
          // window.api.ipcRendererOn("audio-metadata", (_event, data) => {
          setPlayerStatus({
            muted: false,
            playing: true,
            source: {
              type: "audio",
              source: String(query.url),
              album: "Album",
              artist: "Aritst",
              cover: logo,
              title: "Title",
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          // });
          console.log(
            "OLD ipcRendererSend:",
            "get-audio-metadata",
            query.path || query.url
          );
          break;
        case "video":
          setPlayerStatus({
            muted: false,
            playing: true,
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
  }, [settings, playerStatus, setPlayerStatus, query]);

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
          "update\n\npreviousStatus:",
          previousStatus,
          "\nnewStatus:",
          newStatus
        );
        try {
          console.log("OLD ipcRendererSend:", "player-status", newStatus);
        } catch (e) {
          console.warn("Error calling window.api:", e);
        }
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
