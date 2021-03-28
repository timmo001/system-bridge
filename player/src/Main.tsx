import React, { ReactElement, useEffect, useState } from "react";
import { Button, ButtonBase, Container, Fade, Grid } from "@material-ui/core";

import { useSettings } from "./Utils";
import logo from "./resources/system-bridge.svg";
import AudioPlayer from "./AudioPlayer";
import { Close, Minimize } from "@material-ui/icons";

export interface Source {
  album: string;
  artist: string;
  audioSrc: any;
  image: string;
  title: string;
  volumeInitial: number;
}

function Main(): ReactElement {
  const [source, setSource] = useState<Source>();
  const [entered, setEntered] = useState<boolean>(false);
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    if (!source) {
      window.api.ipcRendererSend("get-audio-file");
      setSource({
        audioSrc:
          "https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_5MG.mp3",
        artist: "Some Artist",
        album: "Some Album",
        image: logo,
        title: "Some Track",
        volumeInitial: 10,
      });
    }
  }, [source, setSource]);

  useEffect(() => {
    document.addEventListener("mouseenter", () => setEntered(true));
    document.addEventListener("mouseleave", () => setEntered(false));
  }, []);

  useEffect(() => {
    if (!settings) {
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings, setSettings]);

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
