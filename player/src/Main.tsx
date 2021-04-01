import React, { ReactElement, useEffect, useState } from "react";
import { ButtonBase, Container, Fade } from "@material-ui/core";
import queryString from "query-string";
import { Close, Minimize } from "@material-ui/icons";

import { Configuration } from "../../src/configuration";
import { useSettings } from "./Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "./resources/system-bridge.svg";
import VideoPlayer from "./VideoPlayer";

export interface AudioSource {
  album: string;
  artist: string;
  source: string;
  cover: string;
  title: string;
  volumeInitial: number;
}

export interface VideoSource {
  source: string;
  volumeInitial: number;
}

function Main(): ReactElement {
  const [entered, setEntered] = useState<boolean>(false);
  const [settings, setSettings] = useSettings();
  const [audioSource, setAudioSource] = useState<AudioSource>();
  const [videoSource, setVideoSource] = useState<VideoSource>();

  useEffect(() => {
    document.addEventListener("mouseenter", () => setEntered(true));
    document.addEventListener("mouseleave", () => setEntered(false));
  }, []);

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererOn("set-settings", (_event, args) => {
        console.log("set-settings:", args);
        const s: Configuration = args;
        setSettings(s);
      });
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings, setSettings]);

  useEffect(() => {
    if ((settings && !audioSource) || !videoSource) {
      const query = queryString.parse(window.location.search, {
        parseNumbers: true,
      });
      console.log(query);

      const volume = Number(query.volume);

      window.api.ipcRendererOn("audio-metadata", (_event, data) => {
        console.log(data);
        setAudioSource({
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

      switch (query.type) {
        default:
          break;
        case "audio":
          window.api.ipcRendererSend(
            "get-audio-metadata",
            query.path || query.url
          );
          break;
        case "video":
          window.api.ipcRendererSend(
            "get-video-metadata",
            query.path || query.url
          );
          setVideoSource({
            source: String(query.path)
              ? `http://localhost:${settings?.network.items.port.value}${query.url}`
              : String(query.url),
            volumeInitial: volume > 0 ? volume : 40,
          });
          break;
      }
    }
  }, [settings, audioSource, setAudioSource, videoSource, setVideoSource]);

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
            onClick={() => window.api.ipcRendererSend("window-minimize")}
          >
            <Minimize fontSize="small" style={{ marginTop: -12 }} />
          </ButtonBase>
          <ButtonBase
            style={{ width: 36, height: 28 }}
            onClick={() => window.api.ipcRendererSend("window-close")}
          >
            <Close fontSize="small" />
          </ButtonBase>
        </div>
      </Fade>
      <Container className="center" maxWidth="sm">
        {audioSource ? (
          <AudioPlayer hovering={entered} source={audioSource} />
        ) : videoSource ? (
          <VideoPlayer hovering={entered} source={videoSource} />
        ) : (
          ""
        )}
      </Container>
    </>
  );
}

export default Main;
