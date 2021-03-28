import React, { ReactElement, useEffect, useState } from "react";
import { Container } from "@material-ui/core";

import { useSettings } from "./Utils";
import logo from "./resources/system-bridge.svg";
import AudioPlayer from "./AudioPlayer";

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
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    if (!source) {
      // window.api.ipcRendererSend("get-audio-file");
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
    if (!settings) {
      window.api.ipcRendererSend("get-settings");
    }
  }, [settings, setSettings]);

  return (
    <>
      <div className="draggable-region" />
      <Container className="center" maxWidth="sm">
        {source ? <AudioPlayer track={source} /> : ""}
      </Container>
    </>
  );
}

export default Main;
