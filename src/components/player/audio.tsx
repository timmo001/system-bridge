import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
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

import {
  AudioSource,
  PlayerStatus,
  useHover,
  usePlayer,
} from "components/Player/Utils";

function AudioComponent() {
  const [playerStatus, setPlayerStatus] = usePlayer();
  const [seeking, setSeeking] = useState<boolean>(false);
  const [hoveringRef, isHovering] = useHover();

  const ref = useRef<ReactPlayer>(null);

  const { duration, playing, muted, loaded, position, volume } =
    useMemo<PlayerStatus>(() => playerStatus as PlayerStatus, [playerStatus]);

  const formattedVolume = useMemo<string>(() => {
    return `${(volume * 100).toFixed(0)}%`;
  }, [volume]);

  const formattedPosition = useMemo<string>(() => {
    const md = moment.duration(position, "seconds");
    return `${md.minutes().toString().padStart(2, "0")}:${md
      .seconds()
      .toString()
      .padStart(2, "0")}`;
  }, [position]);

  const formattedDuration = useMemo<string>(() => {
    const md = moment.duration(duration, "seconds");
    return `${md.minutes().toString().padStart(2, "0")}:${md
      .seconds()
      .toString()
      .padStart(2, "0")}`;
  }, [duration]);

  const { artist, album, cover, source, title } = useMemo<AudioSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as AudioSource;
  }, [playerStatus]);

  const handleSetLoaded = useCallback(
    (loaded: boolean) => {
      setPlayerStatus({ ...playerStatus!!, loaded });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleSetPlaying = useCallback(
    (playing: boolean) => {
      setPlayerStatus({ ...playerStatus!!, playing });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleTogglePlaying = useCallback(() => {
    handleSetPlaying(!playing);
  }, [playing, handleSetPlaying]);

  const handleSetMuted = useCallback(
    (muted: boolean) => {
      setPlayerStatus({ ...playerStatus!!, muted });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleToggleMuted = useCallback(() => {
    handleSetMuted(!muted);
  }, [muted, handleSetMuted]);

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
    [muted, volume, playerStatus, setPlayerStatus, handleSetMuted],
  );

  const handleSetDuration = useCallback(
    (duration: number) => {
      setPlayerStatus({
        ...playerStatus!!,
        duration,
      });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleSetPosition = useCallback(
    (pos: number) => {
      if (duration && pos > duration) pos = duration;
      if (pos < 0) pos = 0;
      setPlayerStatus({
        ...playerStatus!!,
        position: pos,
      });
    },
    [playerStatus, duration, setPlayerStatus],
  );

  const handleUpdatePlayerPosition = useCallback(
    (p: number) => {
      ref.current?.seekTo(p, "seconds");
      setSeeking(false);
      // If not already playing, start
      if (!playing) handleSetPlaying(true);
    },
    [playing, handleSetPlaying],
  );

  useEffect(() => {
    if (!loaded) {
      handleSetLoaded(true);
    }
  }, [loaded, handleSetLoaded, handleSetPlaying]);

  function handleScrub(_event: Event, value: number | number[]) {
    handleSetPosition(value as number);
  }

  function handleScrubStart(): void {
    handleSetPlaying(false);
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
        height="0px"
        width="0px"
        muted={muted}
        playing={playing}
        stopOnUnmount
        url={source}
        volume={volume}
        onDuration={(duration: number) => {
          handleSetDuration(duration);
        }}
        onPause={() => {
          handleSetPlaying(false);
        }}
        onPlay={() => {
          handleSetPlaying(true);
        }}
        onStart={() => {
          handleSetPlaying(true);
        }}
        onProgress={({
          playedSeconds,
        }: {
          played: number;
          playedSeconds: number;
          loaded: number;
          loadedSeconds: number;
        }) => {
          if (!seeking) handleSetPosition(playedSeconds);
        }}
      />
      <Grid
        container
        direction="row"
        alignItems="center"
        justifyItems="center"
        wrap="nowrap"
        sx={{
          height: 140,
          width: 540,
          overflow: "hidden",
        }}
      >
        <Grid item sx={{ width: 140, margin: theme.spacing(0, 1, 0, 0) }}>
          {/* @ts-ignore */}
          <Box ref={hoveringRef}>
            <ButtonBase
              aria-label={playing ? "Pause" : "Play"}
              onClick={handleTogglePlaying}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${artist} - ${album}`}
                src={
                  cover ||
                  "https://raw.githubusercontent.com/timmo001/system-bridge/master/resources/system-bridge-dimmed.svg"
                }
                width={140}
              />
              <Fade
                in={isHovering ? true : false}
                timeout={{ enter: 200, exit: 400 }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    display: "flex",
                    height: "100%",
                    width: "100%",
                    zIndex: 100,
                  }}
                >
                  <Icon
                    id={playing ? "pause" : "play"}
                    path={playing ? mdiPause : mdiPlay}
                    size={6}
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
        <Grid item xs>
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

            <Grid item container alignContent="center">
              <Grid item xs={4} />
              <Grid sx={{ margin: theme.spacing(0, 1, 0, 0) }} item>
                <IconButton size="small" onClick={handleToggleMuted}>
                  {muted ? (
                    <Icon id="mute" path={mdiVolumeMute} size={1.25} />
                  ) : (
                    <Icon id="unmute" path={mdiVolumeMedium} size={1.25} />
                  )}
                </IconButton>
              </Grid>
              <Grid sx={{ margin: theme.spacing(0.6, 2, 0, 0) }} item xs>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(_event: Event, value: number | number[]) => {
                    if (typeof value === "number") handleSetVolume(value);
                  }}
                />
              </Grid>
              <Grid
                sx={{
                  margin: theme.spacing(0.9, volume >= 1 ? 1 : 2, 0, 0),
                }}
                item
              >
                <Typography component="span" variant="body2">
                  {formattedVolume}
                </Typography>
              </Grid>
            </Grid>

            <Grid container>
              <Grid sx={{ margin: theme.spacing(0.25, 2, 0, 0) }} item>
                <Typography component="span" variant="body2">
                  {formattedPosition}
                </Typography>
              </Grid>
              <Grid sx={{ margin: theme.spacing(0, 2, 0, 0) }} item xs>
                <Slider
                  min={0}
                  max={duration}
                  step={0.1}
                  value={position}
                  valueLabelDisplay="off"
                  onMouseDown={handleScrubStart}
                  onKeyDown={handleScrubStart}
                  onChange={handleScrub}
                  onMouseUp={handleScrubEnd}
                  onKeyUp={handleScrubEnd}
                />
              </Grid>
              <Grid sx={{ margin: theme.spacing(0.25, 1, 0, 0) }} item>
                <Typography component="span" variant="body2">
                  {formattedDuration}
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
