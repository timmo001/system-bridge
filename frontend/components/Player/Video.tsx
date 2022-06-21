import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player/lazy";

import { PlayerStatus, usePlayer, VideoSource } from "./Utils";

function VideoComponent(): ReactElement {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const ref = useRef<ReactPlayer>(null);

  const { duration, playing, muted, loaded, volume } = useMemo<PlayerStatus>(
    () => playerStatus as PlayerStatus,
    [playerStatus]
  );

  const { source } = useMemo<VideoSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as VideoSource;
  }, [playerStatus]);

  const handleSetLoaded = useCallback(
    (loaded: boolean) => {
      setPlayerStatus({ ...playerStatus!!, loaded });
    },
    [playerStatus, setPlayerStatus]
  );

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
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
    if (!loaded) {
      handleSetLoaded(true);
    }
  }, [loaded, handleSetLoaded, handleSetPlaying]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        ref={ref}
        playing={playing}
        height="100%"
        width="100%"
        style={{ margin: 0, overflow: "hidden" }}
        url={source}
        muted={muted}
        volume={volume}
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
