import React, { ReactElement, useCallback, useEffect, useMemo } from "react";

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

  const isPlaying = useMemo(() => playerStatus?.playing, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(() => handleSetPlaying(!isPlaying), [
    isPlaying,
    handleSetPlaying,
  ]);

  useEffect(() => {
    try {
      window.api.ipcRendererSend("player-status", playerStatus);
    } catch (e) {
      console.warn("Error calling window.api:", e);
    }
  }, [playerStatus]);

  useEffect(() => {
    window.api.ipcRendererOn("player-pause", () => handleSetPlaying(false));
    window.api.ipcRendererOn("player-play", () => handleSetPlaying(true));
    window.api.ipcRendererOn("player-playpause", handleTogglePlaying);
  }, [handleSetPlaying, handleTogglePlaying]);

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
