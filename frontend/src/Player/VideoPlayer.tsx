import React, { useCallback, useEffect, useMemo } from "react";
import ReactPlayer from "react-player/lazy";

import { usePlayer, VideoSource } from "./Utils";

function VideoPlayer() {
  const [playerStatus, setPlayerStatus] = usePlayer();

  const { source, volumeInitial } = useMemo(() => playerStatus!!.source, [
    playerStatus,
  ]) as VideoSource;
  const isPlaying = useMemo(() => playerStatus!!.playing, [playerStatus]);

  const handleSetPlaying = useCallback(
    (playing: boolean) => setPlayerStatus({ ...playerStatus!!, playing }),
    [playerStatus, setPlayerStatus]
  );

  const handleTogglePlaying = useCallback(() => handleSetPlaying(!isPlaying), [
    isPlaying,
    handleSetPlaying,
  ]);

  useEffect(() => {
    window.api.ipcRendererOn("player-pause", () => handleSetPlaying(false));
    window.api.ipcRendererOn("player-play", () => handleSetPlaying(true));
    window.api.ipcRendererOn("player-playpause", handleTogglePlaying);
  }, [handleSetPlaying, handleTogglePlaying]);

  return (
    <>
      <ReactPlayer
        controls
        pip
        playing={isPlaying}
        height="100%"
        width="100%"
        url={source}
        volume={volumeInitial}
        onPause={() => handleSetPlaying(false)}
        onPlay={() => handleSetPlaying(true)}
        onStart={() => handleSetPlaying(true)}
      />
    </>
  );
}

export default VideoPlayer;
