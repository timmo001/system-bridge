import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player/lazy";

import { PlayerStatus, usePlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = usePlayer();
  const [seeking, setSeeking] = useState<boolean>(false);
  const [thumbnail, setThumbnail] = useState<string>();

  const ref = useRef<ReactPlayer>(null);

  const { duration, muted, playing, volume } = useMemo<PlayerStatus>(
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

  const handleUpdateThumbnail = useCallback(
    (t: string) => {
      setThumbnail(t);
      window.api.ipcRendererSend("player-thumbnail-ready");
    },
    [setThumbnail]
  );

  const getThumbnail = useCallback((): string => {
    const player = ref.current?.getInternalPlayer() as any;
    let data = "";
    if (player) {
      try {
        const scale = 480 / player.videoWidth;
        let canvas = document.createElement("canvas") as HTMLCanvasElement;
        canvas
          .getContext("2d")
          ?.drawImage(
            player,
            0,
            0,
            player.videoWidth * scale,
            player.videoHeight * scale
          );
        data = canvas.toDataURL();
      } catch (e) {
        console.error(e);
      }
    }
    handleUpdateThumbnail(data);
    return data;
  }, [handleUpdateThumbnail]);

  const handleSendCover = useCallback(
    (event) => {
      console.log("handleSendCover");
      getThumbnail();
      event.sender.send("player-cover", thumbnail);
    },
    [thumbnail, getThumbnail]
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
    window.api.ipcRendererOn("player-seek", (_e: Event, v: number) =>
      handleUpdatePlayerPosition(v)
    );
    window.api.ipcRendererRemoveAllListeners("player-get-cover");
    window.api.ipcRendererOn("player-get-cover", (e) => handleSendCover(e));
  }, [
    handleToggleMuted,
    handleSetMuted,
    handleSetPlaying,
    handleTogglePlaying,
    handleSetVolume,
    handleSetPosition,
    handleUpdatePlayerPosition,
    handleSendCover,
  ]);

  useEffect(() => {
    if (!thumbnail) getThumbnail();
  }, [thumbnail, getThumbnail]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        ref={ref}
        playing={playing}
        height="100%"
        width="100%"
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
    </>
  );
}

export default VideoPlayer;
