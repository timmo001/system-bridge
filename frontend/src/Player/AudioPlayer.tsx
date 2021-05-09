import React, {
  useState,
  ChangeEvent,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  ButtonBase,
  createStyles,
  Fade,
  Grid,
  IconButton,
  makeStyles,
  Slider,
  Theme,
  Typography,
} from "@material-ui/core";
import { Pause, PlayArrow, VolumeUp, VolumeMute } from "@material-ui/icons";
import moment from "moment";
import ReactPlayer from "react-player/lazy";

import { AudioSource, PlayerStatus, usePlayer } from "./Utils";

interface AudioPlayerProps {
  hovering: boolean;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      height: "100%",
    },
    center: {
      alignSelf: "center",
    },
    gridItem: {
      alignSelf: "center",
      margin: theme.spacing(0, 1, 0, 0),
    },
    overlay: {
      position: "absolute",
      display: "flex",
      background: "rgba(18, 18, 18, 0.6)",
      height: "100%",
      width: "100%",
      zIndex: 100,
    },
    overlayInner: {
      position: "relative",
      margin: "auto",
      fontSize: 82,
    },
    image: {
      height: 110,
      width: 110,
    },
  })
);

function AudioPlayer({ hovering }: AudioPlayerProps) {
  const [playerStatus, setPlayerStatus] = usePlayer();
  const [seeking, setSeeking] = useState<boolean>(false);

  const audioRef = useRef<ReactPlayer>(null);

  const { duration, playing, muted, position, volume } = useMemo<PlayerStatus>(
    () => playerStatus as PlayerStatus,
    [playerStatus]
  );

  const formattedPosition = useMemo(() => {
    const md = moment.duration(position, "seconds");
    return `${md
      .minutes()
      .toString()
      .padStart(2, "0")}:${md.seconds().toString().padStart(2, "0")}`;
  }, [position]);

  const { title, artist, album, cover, source } = useMemo<AudioSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as AudioSource;
  }, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(() => handleSetPlaying(!playing), [
    playing,
    handleSetPlaying,
  ]);

  const handleSetMuted = useCallback(
    (muted: boolean) => setPlayerStatus({ ...playerStatus!!, muted }),
    [playerStatus, setPlayerStatus]
  );

  const handleToggleMuted = useCallback(() => handleSetMuted(!muted), [
    muted,
    handleSetMuted,
  ]);

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

  useEffect(() => {
    window.api.ipcRendererRemoveAllListeners("player-mute-toggle");
    window.api.ipcRendererOn("player-mute-toggle", (_e: Event) =>
      handleToggleMuted()
    );
    window.api.ipcRendererRemoveAllListeners("player-mute");
    window.api.ipcRendererOn("player-mute", (_e: Event, v: boolean) =>
      handleSetMuted(v)
    );
    window.api.ipcRendererRemoveAllListeners("player-pause");
    window.api.ipcRendererOn("player-pause", (_e: Event) =>
      handleSetPlaying(false)
    );
    window.api.ipcRendererRemoveAllListeners("player-play");
    window.api.ipcRendererOn("player-play", (_e: Event) =>
      handleSetPlaying(true)
    );
    window.api.ipcRendererRemoveAllListeners("player-playpause");
    window.api.ipcRendererOn("player-playpause", (_e: Event) =>
      handleTogglePlaying()
    );
    window.api.ipcRendererRemoveAllListeners("player-volume");
    window.api.ipcRendererOn("player-volume", (_e: Event, v: number) =>
      handleSetVolume(v)
    );
    window.api.ipcRendererRemoveAllListeners("player-volume-down");
    window.api.ipcRendererOn("player-volume-down", (_e: Event, v: number) =>
      handleSetVolume(v, "down")
    );
    window.api.ipcRendererRemoveAllListeners("player-volume-up");
    window.api.ipcRendererOn("player-volume-up", (_e: Event, v: number) =>
      handleSetVolume(v, "up")
    );
    window.api.ipcRendererRemoveAllListeners("player-seek");
    window.api.ipcRendererOn("player-volume-up", (_e: Event, v: number) =>
      handleSetVolume(v, "up")
    );
  }, [
    handleToggleMuted,
    handleSetMuted,
    handleSetPlaying,
    handleTogglePlaying,
    handleSetVolume,
  ]);

  function handleScrub(_event: ChangeEvent<{}>, value: number | number[]) {
    if (typeof value === "number") {
      handleSetPosition(value);
    }
  }

  function handleScrubEnd() {
    // If not already playing, start
    if (!playing) handleSetPlaying(true);
    setSeeking(false);
    if (position) audioRef.current?.seekTo(position);
  }

  const classes = useStyles();

  return (
    <>
      <ReactPlayer
        ref={audioRef}
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
        className={classes.root}
        container
        direction="row"
        alignItems="center"
        justify="center"
        wrap="nowrap"
      >
        <Grid className={classes.gridItem} item>
          <ButtonBase
            aria-label={playing ? "Pause" : "Play"}
            onClick={handleTogglePlaying}
          >
            <img
              className={classes.image}
              src={cover}
              alt={`${artist} - ${album}`}
            />
            <Fade in={hovering} timeout={{ enter: 200, exit: 400 }}>
              <div className={classes.overlay}>
                {playing ? (
                  <Pause className={classes.overlayInner} fontSize="large" />
                ) : (
                  <PlayArrow
                    className={classes.overlayInner}
                    fontSize="large"
                  />
                )}
              </div>
            </Fade>
          </ButtonBase>
        </Grid>
        <Grid item xs={8}>
          <Grid
            container
            direction="column"
            alignItems="flex-start"
            justify="space-around"
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

            <Grid item container spacing={2}>
              <Grid item xs={4} />
              <Grid className={classes.center} item>
                <IconButton size="small" onClick={handleToggleMuted}>
                  {muted ? <VolumeMute /> : <VolumeUp />}
                </IconButton>
              </Grid>
              <Grid className={classes.gridItem} item xs>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(
                    _event: ChangeEvent<{}>,
                    value: number | number[]
                  ) => {
                    if (typeof value === "number") handleSetVolume(value);
                  }}
                />
              </Grid>
            </Grid>

            <Grid container>
              <Grid className={classes.gridItem} item />
              <Grid className={classes.gridItem} item xs>
                <Slider
                  min={0}
                  max={duration}
                  step={1}
                  value={position}
                  valueLabelDisplay="off"
                  onChange={handleScrub}
                  onMouseUp={handleScrubEnd}
                  onKeyUp={handleScrubEnd}
                />
              </Grid>
              <Grid className={classes.gridItem} item>
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

export default AudioPlayer;
