import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  useMemo,
  useCallback,
} from "react";
import {
  ButtonBase,
  createStyles,
  Fade,
  Grid,
  makeStyles,
  Slider,
  Theme,
  Typography,
} from "@material-ui/core";
import { Pause, PlayArrow, VolumeUp } from "@material-ui/icons";
import moment from "moment";

import { AudioSource, usePlayer } from "./Utils";

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

let audioTimer: NodeJS.Timeout;

function AudioPlayer({ hovering }: AudioPlayerProps) {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { title, artist, album, cover, source, volumeInitial } = useMemo(
    () => playerStatus!!.source,
    [playerStatus]
  ) as AudioSource;
  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);

  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [volume, setVolume] = useState<number>(volumeInitial);

  const audioRef = useRef(new Audio(source));

  const { duration } = audioRef.current;

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const startTimer = useCallback(() => {
    // Clear any timers already running
    if (audioTimer) clearInterval(audioTimer);

    audioTimer = setInterval(() => {
      if (audioRef.current.ended) {
        handleSetPlaying(false);
      } else {
        setTrackProgress(audioRef.current.currentTime);
      }
    }, 1000);
  }, [handleSetPlaying]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play();
      startTimer();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, startTimer]);

  useEffect(() => {
    audioRef.current = new Audio(source);
    setTrackProgress(audioRef.current.currentTime);
    audioRef.current.volume = volumeInitial / 100;
    handleSetPlaying(true);
  }, [source, volumeInitial, handleSetPlaying]);

  useEffect(() => {
    // Pause and clean up on unmount
    return () => {
      audioRef.current.pause();
      clearInterval(audioTimer);
    };
  }, []);

  function handleScrub(value: number) {
    // Clear any timers already running
    clearInterval(audioTimer);
    audioRef.current.currentTime = value;
    setTrackProgress(audioRef.current.currentTime);
  }

  function handleScrubEnd() {
    // If not already playing, start
    if (!isPlaying) {
      handleSetPlaying(true);
    }
    startTimer();
  }

  function handleSetVolume(value: number) {
    audioRef.current.volume = value / 100;
    setVolume(value);
  }

  const formattedDuration = useMemo(() => {
    const md = moment.duration(trackProgress, "seconds");
    return `${md
      .minutes()
      .toString()
      .padStart(2, "0")}:${md.seconds().toString().padStart(2, "0")}`;
  }, [trackProgress]);

  const classes = useStyles();

  return (
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
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => handleSetPlaying(!isPlaying)}
        >
          <img
            className={classes.image}
            src={cover}
            alt={`${artist} - ${album}`}
          />
          <Fade in={hovering} timeout={{ enter: 200, exit: 400 }}>
            <div className={classes.overlay}>
              {isPlaying ? (
                <Pause className={classes.overlayInner} fontSize="large" />
              ) : (
                <PlayArrow className={classes.overlayInner} fontSize="large" />
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
              <VolumeUp />
            </Grid>
            <Grid className={classes.gridItem} item xs>
              <Slider
                min={0}
                max={100}
                step={5}
                value={volume}
                valueLabelDisplay="auto"
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
                max={duration ? duration : 1}
                step={1}
                value={trackProgress}
                valueLabelDisplay="off"
                onChange={(
                  _event: ChangeEvent<{}>,
                  value: number | number[]
                ) => {
                  if (typeof value === "number") handleScrub(value);
                }}
                onMouseUp={handleScrubEnd}
                onKeyUp={handleScrubEnd}
              />
            </Grid>
            <Grid className={classes.gridItem} item>
              <Typography component="span" variant="body2">
                {formattedDuration}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default AudioPlayer;
