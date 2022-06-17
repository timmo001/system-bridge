import React, { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Box,
  ButtonBase,
  Fade,
  Grid,
  IconButton,
  Slider,
  Typography,
  useTheme,
} from "@mui/material";
import { Icon } from "@mdi/react";
import { mdiPause, mdiPlay, mdiVolumeMedium, mdiVolumeMute } from "@mdi/js";
import moment from "moment";
import ReactPlayer from "react-player/lazy";

import { AudioSource, PlayerStatus, useHover, usePlayer } from "./Utils";

function AudioComponent() {
  const [playerStatus, setPlayerStatus] = usePlayer();
  const [seeking, setSeeking] = useState<boolean>(false);
  const [hoverRef, isHovering] = useHover();

  const ref = useRef<ReactPlayer>(null);

  const { duration, playing, muted, position, volume } = useMemo<PlayerStatus>(
    () => playerStatus as PlayerStatus,
    [playerStatus]
  );

  const formattedPosition = useMemo(() => {
    const md = moment.duration(position, "seconds");
    return `${md.minutes().toString().padStart(2, "0")}:${md
      .seconds()
      .toString()
      .padStart(2, "0")}`;
  }, [position]);

  const { artist, album, cover, source, title } = useMemo<AudioSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as AudioSource;
  }, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(
    () => handleSetPlaying(!playing),
    [playing, handleSetPlaying]
  );

  const handleSetMuted = useCallback(
    (muted: boolean) => setPlayerStatus({ ...playerStatus!!, muted }),
    [playerStatus, setPlayerStatus]
  );

  const handleToggleMuted = useCallback(
    () => handleSetMuted(!muted),
    [muted, handleSetMuted]
  );

  const handleSetVolume = useCallback(
    (v: number, type?: "down" | "up") => {
      let vol = type === "down" ? volume - v : type === "up" ? volume + v : v;
      if (vol > 1) vol = 1;
      if (vol < 0) vol = 0;
      setPlayerStatus({
        ...playerStatus!!,
        volume: vol,
      });
      if (muted) handleSetMuted(false);
    },
    [muted, volume, playerStatus, setPlayerStatus, handleSetMuted]
  );

  const handleSetDuration = useCallback(
    (duration: number) =>
      setPlayerStatus({
        ...playerStatus!!,
        duration,
      }),
    [playerStatus, setPlayerStatus]
  );

  const handleSetPosition = useCallback(
    (p: number) => {
      if (duration && p > duration) p = duration;
      if (p < 0) p = 0;
      setPlayerStatus({
        ...playerStatus!!,
        position: p,
      });
    },
    [playerStatus, duration, setPlayerStatus]
  );

  const handleUpdatePlayerPosition = useCallback(
    (p: number) => {
      // If not already playing, start
      if (!playing) handleSetPlaying(true);
      setSeeking(false);
      ref.current?.seekTo(p);
    },
    [playing, handleSetPlaying]
  );

  const handleSendCover = useCallback(
    (event: any) => {
      console.log("handleSendCover");
      event.sender.send("player-cover", cover);
    },
    [cover]
  );

  // useEffect(() => {
  //   window.api.ipcRendererRemoveAllListeners("player-mute-toggle");
  //   window.api.ipcRendererOn("player-mute-toggle", (_e: Event) =>
  //     handleToggleMuted()
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-mute");
  //   window.api.ipcRendererOn("player-mute", (_e: Event, v: boolean) =>
  //     handleSetMuted(v)
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-pause");
  //   window.api.ipcRendererOn("player-pause", (_e: Event) =>
  //     handleSetPlaying(false)
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-play");
  //   window.api.ipcRendererOn("player-play", (_e: Event) =>
  //     handleSetPlaying(true)
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-playpause");
  //   window.api.ipcRendererOn("player-playpause", (_e: Event) =>
  //     handleTogglePlaying()
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-volume");
  //   window.api.ipcRendererOn("player-volume", (_e: Event, v: number) =>
  //     handleSetVolume(v)
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-volume-down");
  //   window.api.ipcRendererOn("player-volume-down", (_e: Event, v: number) =>
  //     handleSetVolume(v, "down")
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-volume-up");
  //   window.api.ipcRendererOn("player-volume-up", (_e: Event, v: number) =>
  //     handleSetVolume(v, "up")
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-seek");
  //   window.api.ipcRendererOn("player-seek", (_e: Event, v: number) =>
  //     handleUpdatePlayerPosition(v)
  //   );
  //   window.api.ipcRendererRemoveAllListeners("player-get-cover");
  //   window.api.ipcRendererOn("player-get-cover", (e) => handleSendCover(e));
  // }, [
  //   handleToggleMuted,
  //   handleSetMuted,
  //   handleSetPlaying,
  //   handleTogglePlaying,
  //   handleSetVolume,
  //   handleSetPosition,
  //   handleUpdatePlayerPosition,
  //   handleSendCover,
  // ]);

  function handleScrub(_event: Event, value: number | number[]) {
    if (typeof value === "number") {
      handleSetPosition(value);
    }
  }

  function handleScrubStart(): void {
    setSeeking(true);
  }

  function handleScrubEnd(): void {
    if (position) handleUpdatePlayerPosition(position);
  }

  const theme = useTheme();

  return (
    <>
      <ReactPlayer
        ref={ref}
        playing={playing}
        height="0px"
        width="0px"
        url={source}
        muted={muted}
        volume={volume}
        onDuration={(duration: number) => {
          if (!seeking) handleSetDuration(duration);
        }}
        onPause={() => handleSetPlaying(false)}
        onPlay={() => handleSetPlaying(true)}
        onStart={() => handleSetPlaying(true)}
        onProgress={({
          playedSeconds,
        }: {
          played: number;
          playedSeconds: number;
          loaded: number;
          loadedSeconds: number;
        }) => handleSetPosition(playedSeconds)}
      />
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyItems="center"
        wrap="nowrap"
      >
        <Grid item xs={3} sx={{ margin: theme.spacing(0, 1, 0, 0) }}>
          <Box ref={hoverRef}>
            <ButtonBase
              aria-label={playing ? "Pause" : "Play"}
              onClick={handleTogglePlaying}
            >
              {cover ? (
                <Image src={cover} alt={`${artist} - ${album}`} />
              ) : (
                <Box />
              )}
              <Fade
                in={isHovering ? true : false}
                timeout={{ enter: 200, exit: 400 }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    display: "flex",
                    background: "rgba(18, 18, 18, 0.6)",
                    height: "100%",
                    width: "100%",
                    zIndex: 100,
                  }}
                >
                  <Icon
                    id={playing ? "pause" : "play"}
                    path={playing ? mdiPause : mdiPlay}
                    size={24}
                    style={{
                      position: "relative",
                      margin: "auto",
                    }}
                  />
                </Box>
              </Fade>
            </ButtonBase>
          </Box>
        </Grid>
        <Grid item xs={8}>
          <Grid
            container
            direction="column"
            alignItems="flex-start"
            justifyItems="space-around"
          >
            <Grid item>
              <Typography
                color="textPrimary"
                component="span"
                variant="subtitle1"
                noWrap
              >
                {artist} - {title}
              </Typography>
            </Grid>
            <Grid item>
              <Typography
                color="textSecondary"
                component="span"
                variant="subtitle2"
                noWrap
              >
                {album}
              </Typography>
            </Grid>

            <Grid item container spacing={2} alignContent="center">
              <Grid item xs={4} />
              <Grid item>
                <IconButton onClick={handleToggleMuted}>
                  {muted ? (
                    <Icon id="mute" path={mdiVolumeMute} size={1.5} />
                  ) : (
                    <Icon id="unmute" path={mdiVolumeMedium} size={1.5} />
                  )}
                </IconButton>
              </Grid>
              <Grid sx={{ margin: theme.spacing(0, 1, 0, 0) }} item xs>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(_event: Event, value: number | number[]) => {
                    if (typeof value === "number") handleSetVolume(value);
                  }}
                />
              </Grid>
            </Grid>

            <Grid container>
              <Grid sx={{ margin: theme.spacing(0, 1, 0, 0) }} item />
              <Grid sx={{ margin: theme.spacing(0, 1, 0, 0) }} item xs>
                <Slider
                  min={0}
                  max={duration}
                  step={1}
                  value={position}
                  valueLabelDisplay="off"
                  onMouseDown={handleScrubStart}
                  onKeyDown={handleScrubStart}
                  onChange={handleScrub}
                  onMouseUp={handleScrubEnd}
                  onKeyUp={handleScrubEnd}
                />
              </Grid>
              <Grid sx={{ margin: theme.spacing(0, 1, 0, 0) }} item>
                <Typography component="span" variant="body2">
                  {formattedPosition}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}

export default AudioComponent;
