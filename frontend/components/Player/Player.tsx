import React, { ReactElement, useEffect, useMemo } from "react";
import { useRouter } from "next/dist/client/router";
import { cloneDeep, isEqual } from "lodash";

import { PlayerStatus, usePlayer } from "./Utils";
import { usePrevious } from "../Common/Utils";
import AudioComponent from "./Audio";
import VideoComponent from "./Video";

interface PlayerProps {
  playerType: "audio" | "video";
  entered?: boolean;
}

function PlayerComponent({ playerType, entered }: PlayerProps): ReactElement {
  const [playerStatus, setPlayerStatus] = usePlayer();
  const previousPlayerStatus = usePrevious(playerStatus);

  const router = useRouter();
  const query = router.query as NodeJS.Dict<string>;

  useEffect(() => {
    if (!playerStatus && router.isReady) {
      const volume = Number(query.volume);
      switch (playerType) {
        default:
          break;
        case "audio":
          setPlayerStatus({
            muted: false,
            playing: query.autoplay?.toLowerCase() === "true",
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "audio",
              source: query.url,
              album: query.album || "Unknown Album",
              artist: query.artist || "Unknown Aritst",
              cover: query.cover,
              title: query.title || "Unknown Title",
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
        case "video":
          setPlayerStatus({
            muted: false,
            playing: false,
            loaded: false,
            position: 0,
            duration: 1,
            source: {
              type: "video",
              source: String(query.url),
              volumeInitial: (volume > 0 ? volume : 40) / 100,
            },
            volume: (volume > 0 ? volume : 40) / 100,
          });
          break;
      }
    }
  }, [playerStatus, setPlayerStatus, playerType, router, query]);

  useEffect(() => {
    if (playerStatus) {
      let previousStatus;
      if (previousPlayerStatus) {
        previousStatus = cloneDeep(previousPlayerStatus) as PlayerStatus;
        if (previousStatus.source.type === "audio")
          delete previousStatus.source.cover;
      }
      let newStatus = cloneDeep(playerStatus);
      if (newStatus.source.type === "audio") delete newStatus.source.cover;
      if (!isEqual(newStatus, previousStatus)) {
        console.log(
          "Player update\n\npreviousStatus:",
          previousStatus,
          "\nnewStatus:",
          newStatus
        );
      }
    }
  }, [playerStatus, previousPlayerStatus]);

  const type = useMemo<string | undefined>(() => {
    if (!playerStatus) return undefined;
    const status = playerStatus as PlayerStatus;
    return status.source.type;
  }, [playerStatus]);

  return (
    <>
      {type === "audio" ? (
        <AudioComponent />
      ) : type === "video" ? (
        <VideoComponent />
      ) : (
        ""
      )}
    </>
  );
}

export default PlayerComponent;
