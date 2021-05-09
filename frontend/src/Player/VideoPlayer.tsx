import React, { useCallback, useEffect, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { usePlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { source } = useMemo(() => playerStatus!!.source, [
    playerStatus,
  ]) as VideoSource;
  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);
  const muted = useMemo(() => playerStatus!!.muted, [playerStatus]);
  const volume = useMemo(() => playerStatus!!.volume, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(() => handleSetPlaying(!isPlaying), [
    isPlaying,
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
      setPlayerStatus({
        ...playerStatus!!,
        volume: type === "down" ? volume - v : type === "up" ? volume + v : v,
      });
      if (muted) handleSetMuted(false);
    },
    [muted, volume, playerStatus, setPlayerStatus, handleSetMuted]
  );

  useEffect(() => {
    window.api.ipcRendererOn("player-mute-toggle", handleToggleMuted);
    window.api.ipcRendererOn("player-mute", (_e: Event, v: boolean) =>
      handleSetMuted(v)
    );
    window.api.ipcRendererOn("player-pause", (_e: Event) =>
      handleSetPlaying(false)
    );
    window.api.ipcRendererOn("player-play", (_e: Event) =>
      handleSetPlaying(true)
    );
    window.api.ipcRendererOn("player-playpause", handleTogglePlaying);
    window.api.ipcRendererOn("player-volume", (_e: Event, v: number) =>
      handleSetVolume(v)
    );
    window.api.ipcRendererOn("player-volume-down", (_e: Event, v: number) =>
      handleSetVolume(v, "down")
    );
    window.api.ipcRendererOn("player-volume-up", (_e: Event, v: number) =>
      handleSetVolume(v, "up")
    );
  }, [
    handleSetMuted,
    handleToggleMuted,
    handleSetPlaying,
    handleTogglePlaying,
    handleSetVolume,
  ]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={isPlaying}
        height="100%"
        width="100%"
        url={source}
        muted={muted}
        volume={volume}
        onPause={() => handleSetPlaying(false)}
        onPlay={() => handleSetPlaying(true)}
        onStart={() => handleSetPlaying(true)}
      />
    </>
  );
}

export default VideoPlayer;
