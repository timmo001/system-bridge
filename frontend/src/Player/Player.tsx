import React, { ReactElement, useEffect, useMemo } from "react";

import { parsedQuery, useSettings } from "../Utils";
import { usePlayer } from "./Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "../resources/system-bridge.svg";
import VideoPlayer from "./VideoPlayer";

interface PlayerProps {
  entered: boolean;
}

function Player({ entered }: PlayerProps): ReactElement {
  const [settings] = useSettings();
  const [playerStatus, setPlayerStatus] = usePlayer();

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
                source: {
                  type: "audio",
                  source: String(query.url),
                  album: data.album,
                  artist: data.artist,
                  cover: data.cover || logo,
                  title: data.title,
                  volumeInitial: (volume > 0 ? volume : 40) / 100,
                },
                playing: true,
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
            source: {
              type: "video",
              source: String(query.url),
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            playing: true,
          });
          break;
      }
    }
  }, [settings, playerStatus, setPlayerStatus, query]);

  useEffect(() => {
    if (playerStatus) {
      try {
        window.api.ipcRendererSend("player-status", {
          playing: playerStatus.playing,
        });
      } catch (e) {
        console.warn("Error calling window.api:", e);
      }
    }
  }, [playerStatus]);

  return (
    <>
      {playerStatus?.source.type === "audio" ? (
        <AudioPlayer hovering={entered} />
      ) : playerStatus?.source.type === "video" ? (
        <VideoPlayer />
      ) : (
        ""
      )}
    </>
  );
}

export default Player;
