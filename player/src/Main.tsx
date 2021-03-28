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
    <Container maxWidth="sm">
      {source ? (
        <>
          <AudioPlayer track={source} />
          {/* <Grid
            container
            direction="row"
            alignItems="center"
            justify="flex-start"
            spacing={2}
          >
            <Grid item>
              <IconButton
                aria-label={source.playing ? "Pause" : "Play"}
                onClick={handleTogglePlaying}
              >
                <img src={logo} alt="Album" />
              </IconButton>
            </Grid>
            <Grid item xs>
              <Grid
                container
                direction="column"
                alignItems="flex-start"
                justify="space-around"
              >
                <Grid item>
                  <Typography color="textPrimary" component="span" variant="h5">
                    {source.artist} - {source.track}
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography
                    color="textSecondary"
                    component="span"
                    variant="subtitle1"
                  >
                    {source.album}
                  </Typography>
                </Grid>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Slider
                      max={100}
                      min={0}
                      step={5}
                      value={Math.round(source.volume * 100)}
                      valueLabelDisplay="auto"
                      onChange={handleSetVolume}
                    />
                  </Grid>
                  <Grid item>
                    <VolumeUp />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          <ReactAudioPlayer
            ref={(ref) => setSource({ ...source, ref })}
            autoPlay
            listenInterval={1000}
            muted={source.muted}
            onAbort={() => setSource({ ...source, playing: false })}
            onEnded={() => setSource({ ...source, playing: false })}
            onListen={(l) => console.log(l)}
            onPause={() => setSource({ ...source, playing: false })}
            onPlay={() => setSource({ ...source, playing: true })}
            src={source.path}
            volume={source.volume}
          /> */}
        </>
      ) : (
        ""
      )}
    </Container>
  );
}

export default Main;
