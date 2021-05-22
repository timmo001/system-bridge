import React, {
  createContext,
  ReactElement,
  useContext,
  useState,
} from "react";

export interface Source {
  type: "audio" | "video";
  source?: string;
  volumeInitial: number;
}

export interface AudioSource extends Source {
  type: "audio";
  album: string;
  artist: string;
  cover?: string;
  title: string;
}

export interface VideoSource extends Source {
  type: "video";
}

export interface PlayerStatus {
  duration?: number;
  hasCover?: boolean;
  muted: boolean;
  playing: boolean;
  position?: number;
  source: AudioSource | VideoSource;
  volume: number;
}

const PlayerContext = createContext<PlayerStatus | undefined>(undefined);
const SetPlayerContext =
  createContext<null | React.Dispatch<
    React.SetStateAction<PlayerStatus | undefined>
  >>(null);

export const PlayerProvider = ({
  children,
}: {
  children: ReactElement;
}): ReactElement => {
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>();

  return (
    <SetPlayerContext.Provider value={setPlayerStatus}>
      <PlayerContext.Provider value={playerStatus}>
        {children}
      </PlayerContext.Provider>
    </SetPlayerContext.Provider>
  );
};

export const usePlayer = (): [
  player: PlayerStatus | undefined,
  setPlayer: React.Dispatch<React.SetStateAction<PlayerStatus | undefined>>
] => {
  const player = useContext(PlayerContext);
  const setPlayer = useContext(SetPlayerContext);
  if (setPlayer === null) throw new Error(); // this will make setPlayer non-null
  return [player, setPlayer];
};
