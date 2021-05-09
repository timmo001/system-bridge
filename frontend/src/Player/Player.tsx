import React, { ReactElement, useEffect, useMemo } from "react";
import { cloneDeep, isEqual } from "lodash";

import { parsedQuery, usePrevious, useSettings } from "../Utils";
import { PlayerStatus, usePlayer } from "./Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "../resources/system-bridge.svg";
import VideoPlayer from "./VideoPlayer";

interface PlayerProps {
  entered: boolean;
}

function Player({ entered }: PlayerProps): ReactElement {
  const [settings] = useSettings();
  const [playerStatus, setPlayerStatus] = usePlayer();
  const previousPlayerStatus = usePrevious(playerStatus);

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    if (settings && !playerStatus) {
      console.log(query);
      const volume = Number(query.volume);
      switch (query.type) {
        default:
          break;
        case "audio":
          try {
            window.api.ipcRendererOn("audio-metadata", (_event, data) => {
              setPlayerStatus({
                muted: false,
                playing: true,
                source: {
                  type: "audio",
                  source: String(query.url),
                  album: data.album,
                  artist: data.artist,
                  cover: data.cover || logo,
                  title: data.title,
                  volumeInitial: (volume > 0 ? volume : 40) / 100,
                },
                volume: (volume > 0 ? volume : 40) / 100,
              });
            });
            window.api.ipcRendererSend(
              "get-audio-metadata",
              query.path || query.url
            );
          } catch (e) {
            console.warn("Error calling window.api:", e);
          }
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
        previousStatus.source.source = previousStatus.source.source?.replace(
          "safe-file-protocol://",
          ""
        );
        if (previousStatus.source.type === "audio")
          delete previousStatus.source.cover;
      }
      let newStatus = cloneDeep(playerStatus);
      newStatus.source.source = newStatus.source.source?.replace(
        "safe-file-protocol://",
        ""
      );
      if (newStatus.source.type === "audio") delete newStatus.source.cover;
      if (!isEqual(newStatus, previousStatus)) {
        console.log(
          "update\n\npreviousStatus:",
          previousStatus,
          "\nnewStatus:",
          newStatus
        );
        try {
          window.api.ipcRendererSend("player-status", newStatus);
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
        <AudioPlayer hovering={entered} />
      ) : type === "video" ? (
        <VideoPlayer />
      ) : (
        ""
      )}
    </>
  );
}

export default Player;
