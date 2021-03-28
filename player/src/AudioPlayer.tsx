import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  createStyles,
  Fade,
  Grid,
  IconButton,
  makeStyles,
  Slider,
  Typography,
} from "@material-ui/core";
import { Pause, PlayArrow, VolumeUp } from "@material-ui/icons";

import { Source } from "./Main";

interface AudioPlayerProps {
  track: Source;
}

const useStyles = makeStyles(() =>
  createStyles({
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
  })
);

let audioTimer: NodeJS.Timeout;

function AudioPlayer({ track }: AudioPlayerProps) {
  const { title, artist, album, image, audioSrc, volumeInitial } = track;

  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(volumeInitial);
  const [hovering, setHovering] = useState<boolean>(false);

  const audioRef = useRef(new Audio(audioSrc));
  const isReady = useRef(false);

  const { duration } = audioRef.current;

  useEffect(() => {
    if (isPlaying) {
      audioRef.current.play();
      startTimer();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    audioRef.current.pause();

    audioRef.current = new Audio(audioSrc);
    setTrackProgress(audioRef.current.currentTime);
    audioRef.current.volume = volumeInitial / 100;

    if (isReady.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimer();
    } else {
      // Set the isReady ref as true for the next pass
      isReady.current = true;
    }
  }, [audioSrc, volumeInitial]);

  useEffect(() => {
    // Pause and clean up on unmount
    return () => {
      audioRef.current.pause();
      clearInterval(audioTimer);
    };
  }, []);

  function startTimer() {
    // Clear any timers already running
    clearInterval(audioTimer);

    if (audioTimer)
      audioTimer = setInterval(() => {
        if (audioRef.current.ended) {
        } else {
          setTrackProgress(audioRef.current.currentTime);
        }
      }, 1000);
  }

  function handleScrub(value: number) {
    // Clear any timers already running
    clearInterval(audioTimer);
    audioRef.current.currentTime = value;
    setTrackProgress(audioRef.current.currentTime);
  }

  function handleScrubEnd() {
    // If not already playing, start
    if (!isPlaying) {
      setIsPlaying(true);
    }
    startTimer();
  }

  function handleSetVolume(value: number) {
    audioRef.current.volume = value / 100;
    setVolume(value);
  }

  const classes = useStyles();

  return (
    <Grid
      container
      direction="row"
      alignItems="center"
      justify="flex-start"
      spacing={2}
    >
      <Grid item>
        <IconButton
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={() => setIsPlaying(!isPlaying)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <img src={image} alt={`${artist} - ${album}`} />
          <Fade in={hovering} timeout={{ enter: 200, exit: 400 }}>
            <div className={classes.overlay}>
              {isPlaying ? (
                <Pause className={classes.overlayInner} fontSize="large" />
              ) : (
                <PlayArrow className={classes.overlayInner} fontSize="large" />
              )}
            </div>
          </Fade>
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
              {artist} - {title}
            </Typography>
          </Grid>
          <Grid item>
            <Typography
              color="textSecondary"
              component="span"
              variant="subtitle1"
            >
              {album}
            </Typography>
          </Grid>

          <Grid item container spacing={2}>
            <Grid item xs={4} />
            <Grid item>
              <VolumeUp />
            </Grid>
            <Grid item xs>
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

          <Grid container spacing={2}>
            <Grid item xs>
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
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default AudioPlayer;
