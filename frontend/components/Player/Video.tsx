import React, { ReactElement, useCallback, useEffect, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { PlayerStatus, usePlayer, VideoSource } from "./Utils";

function VideoComponent(): ReactElement {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { autoplay, duration, playing, muted, loaded, volume } =
    useMemo<PlayerStatus>(() => playerStatus as PlayerStatus, [playerStatus]);

  const { source } = useMemo<VideoSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as VideoSource;
  }, [playerStatus]);

  const handleSetLoaded = useCallback(
    (loaded: boolean) => {
      setPlayerStatus({ ...playerStatus!!, loaded });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleSetPlaying = useCallback(
    (playing: boolean) => {
      console.log("Set playing:", playing);
      setPlayerStatus({ ...playerStatus!!, playing });
    },
    [playerStatus, setPlayerStatus],
  );

  const handleSetMuted = useCallback(
    (muted: boolean) => {
      setPlayerStatus({ ...playerStatus!!, muted });
    },
    [playerStatus, setPlayerStatus],
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
    [muted, volume, playerStatus, setPlayerStatus, handleSetMuted],
  );

  const handleSetDuration = useCallback(
    (duration: number) =>
      setPlayerStatus({
        ...playerStatus!!,
        duration,
      }),
    [playerStatus, setPlayerStatus],
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
    [playerStatus, duration, setPlayerStatus],
  );

  useEffect(() => {
    if (!loaded) {
      handleSetLoaded(true);
    }
  }, [loaded, handleSetLoaded]);

  return (
    <>
      <ReactPlayer
        autoPlay={autoplay}
        controls
        height="270px"
        width="480px"
        playsinline
        muted={muted}
        playing={playing}
        url={source}
        volume={volume}
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          overflow: "hidden",
        }}
        onReady={() => {
          console.log("Autoplay:", autoplay);
          handleSetPlaying(autoplay || false);
        }}
        onDuration={(duration: number) => handleSetDuration(duration)}
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
    </>
  );
}

export default VideoComponent;
