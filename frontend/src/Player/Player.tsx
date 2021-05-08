import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ButtonBase, Fade } from "@material-ui/core";
import { Close, Minimize } from "@material-ui/icons";

import { parsedQuery, useSettings } from "../Utils";
import { PlayerProvider, usePlayer } from "./Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "../resources/system-bridge.svg";
import VideoPlayer from "./VideoPlayer";

function Player(): ReactElement {
  const [entered, setEntered] = useState<boolean>(false);
  const [settings] = useSettings();
  const [playerStatus, setPlayerStatus] = usePlayer();

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    document.addEventListener("mouseenter", () => setEntered(true));
    document.addEventListener("mouseleave", () => setEntered(false));
  }, []);

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
                  volumeInitial: volume > 0 ? volume : 40,
                },
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
              volumeInitial: volume > 0 ? volume : 60,
            },
          });
          break;
      }
    }
  }, [settings, playerStatus, setPlayerStatus, query]);

  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(() => handleSetPlaying(!isPlaying), [
    isPlaying,
    handleSetPlaying,
  ]);

  useEffect(() => {
    window.api.ipcRendererOn("player-pause", () => handleSetPlaying(false));
    window.api.ipcRendererOn("player-play", () => handleSetPlaying(true));
    window.api.ipcRendererOn("player-playpause", handleTogglePlaying);
  }, [handleSetPlaying, handleTogglePlaying]);

  return (
    <>
      <div className="draggable-region" />
      <Fade in={entered} timeout={{ enter: 200, exit: 400 }}>
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: 0,
            right: 0,
            zIndex: 10000,
          }}
        >
          <ButtonBase
            style={{ width: 36, height: 28 }}
            onClick={() => {
              try {
                window.api.ipcRendererSend("window-minimize");
              } catch (e) {
                console.warn("Error calling window-minimize:", e);
              }
            }}
          >
            <Minimize fontSize="small" style={{ marginTop: -12 }} />
          </ButtonBase>
          <ButtonBase
            style={{ width: 36, height: 28 }}
            onClick={() => {
              try {
                window.api.ipcRendererSend("window-close");
              } catch (e) {
                console.warn("Error calling window-close:", e);
              }
            }}
          >
            <Close fontSize="small" />
          </ButtonBase>
        </div>
      </Fade>
      <PlayerProvider>
        {playerStatus?.source.type === "audio" ? (
          <AudioPlayer hovering={entered} />
        ) : playerStatus?.source.type === "video" ? (
          <VideoPlayer />
        ) : (
          <div />
        )}
      </PlayerProvider>
    </>
  );
}

export default Player;
