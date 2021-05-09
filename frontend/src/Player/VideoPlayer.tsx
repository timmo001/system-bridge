import React, { useCallback, useEffect, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { PlayerStatus, usePlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { playing, muted, volume } = useMemo<PlayerStatus>(
    () => playerStatus as PlayerStatus,
    [playerStatus]
  );

  const { source } = useMemo<VideoSource>(() => {
    const status = playerStatus as PlayerStatus;
    return status.source as VideoSource;
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
      setPlayerStatus({
        ...playerStatus!!,
        volume: type === "down" ? volume - v : type === "up" ? volume + v : v,
      });
      if (muted) handleSetMuted(false);
    },
    [muted, volume, playerStatus, setPlayerStatus, handleSetMuted]
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
  }, [
    handleToggleMuted,
    handleSetMuted,
    handleSetPlaying,
    handleTogglePlaying,
    handleSetVolume,
  ]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={playing}
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
