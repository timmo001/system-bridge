import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { ButtonBase, Fade } from "@material-ui/core";
import { Close, Minimize } from "@material-ui/icons";

import { parsedQuery, useSettings } from "../Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "../resources/system-bridge.svg";
import VideoPlayer from "./VideoPlayer";

export interface Source {
  type: "audio" | "video";
  source: string;
  volumeInitial: number;
}

export interface AudioSource extends Source {
  type: "audio";
  album: string;
  artist: string;
  cover: string;
  title: string;
}

export interface VideoSource extends Source {
  type: "video";
}

function Player(): ReactElement {
  const [entered, setEntered] = useState<boolean>(false);
  const [settings] = useSettings();
  const [source, setSource] = useState<AudioSource | VideoSource>();

  const query = useMemo(() => parsedQuery, []);

  useEffect(() => {
    document.addEventListener("mouseenter", () => setEntered(true));
    document.addEventListener("mouseleave", () => setEntered(false));
  }, []);

  useEffect(() => {
    if (settings && !source) {
      console.log(query);
      const volume = Number(query.volume);
      switch (query.type) {
        default:
          break;
        case "audio":
          try {
            window.api.ipcRendererOn("audio-metadata", (_event, data) => {
              setSource({
                type: "audio",
                source: String(query.path)
                  ? `http://localhost:${settings?.network.items.port.value}${query.url}`
                  : String(query.url),
                album: data.album,
                artist: data.artist,
                cover: data.cover || logo,
                title: data.title,
                volumeInitial: volume > 0 ? volume : 40,
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
          setSource({
            type: "video",
            source: String(query.path)
              ? `http://localhost:${settings?.network.items.port.value}${query.url}`
              : String(query.url),
            volumeInitial: volume > 0 ? volume : 60,
          });
          break;
      }
    }
  }, [settings, source, setSource]);

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
      {source?.type === "audio" ? (
        <AudioPlayer hovering={entered} source={source} />
      ) : source?.type === "video" ? (
        <VideoPlayer source={source} />
      ) : (
        ""
      )}
    </>
  );
}

export default Player;
