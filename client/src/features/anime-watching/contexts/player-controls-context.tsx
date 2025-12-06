import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { WatchInfo } from "@/types/watch";

interface Server {
  epNo: number;
  serverName: string;
  serverId: string;
  type: "SUB" | "DUB";
  embedLink: string;
  serverIdx: number;
}

interface PlayerControlsContextType {
  selectedServer: Server | null;
  setSelectedServer: (server: Server | null) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const PlayerControlsContext = createContext<PlayerControlsContextType | undefined>(
  undefined
);

interface PlayerControlsProviderProps {
  children: ReactNode;
  watchInfo: WatchInfo;
}

export function PlayerControlsProvider({
  children,
  watchInfo
}: PlayerControlsProviderProps) {
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Set the first SUB server as default when watchInfo changes
  useEffect(() => {
    if (watchInfo.embeds.sub.length > 0 && !selectedServer) {
      const firstSubEmbed = watchInfo.embeds.sub[0];
      setSelectedServer({
        serverIdx: firstSubEmbed.serverIdx,
        serverName: firstSubEmbed.serverName,
        embedLink: firstSubEmbed.embedLink,
        epNo: watchInfo.currentEpisode,
        serverId: firstSubEmbed.serverId,
        type: "SUB",
      });
    }
  }, [watchInfo, selectedServer]);

  return (
    <PlayerControlsContext.Provider
      value={{
        selectedServer,
        setSelectedServer,
        isPlaying,
        setIsPlaying,
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        isFullscreen,
        setIsFullscreen,
        playbackSpeed,
        setPlaybackSpeed,
      }}
    >
      {children}
    </PlayerControlsContext.Provider>
  );
}

export function usePlayerControls() {
  const context = useContext(PlayerControlsContext);
  if (context === undefined) {
    throw new Error(
      "usePlayerControls must be used within a PlayerControlsProvider"
    );
  }
  return context;
}

export type { Server, PlayerControlsContextType };
