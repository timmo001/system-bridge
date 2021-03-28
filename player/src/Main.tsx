import React, { ReactElement, useEffect, useState } from "react";
import { ButtonBase, Container, Fade } from "@material-ui/core";
import queryString from "query-string";

import { Close, Minimize } from "@material-ui/icons";
import { Configuration } from "../../src/configuration";
import { useSettings } from "./Utils";
import AudioPlayer from "./AudioPlayer";
import logo from "./resources/system-bridge.svg";

export interface Source {
  album: string;
  artist: string;
  audioSrc: any;
  cover: string;
  title: string;
  volumeInitial: number;
}

function Main(): ReactElement {
  const [entered, setEntered] = useState<boolean>(false);
  const [settings, setSettings] = useSettings();
  const [source, setSource] = useState<Source>();

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
    if (settings && !source) {
      const query = queryString.parse(window.location.search);
      console.log(query);

      window.api.ipcRendererOn("audio-metadata", (_event, data) => {
        console.log(data);
        setSource({
          audioSrc: `http://localhost:${settings.network.items.port.value}${query.url}`,
          album: data.album,
          artist: data.artist,
          cover: data.cover || logo,
          title: data.title,
          volumeInitial: 10,
        });
      });
      window.api.ipcRendererSend("get-audio-metadata", query.path);
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
        {source ? <AudioPlayer hovering={entered} track={source} /> : ""}
      </Container>
    </>
  );
}

export default Main;
