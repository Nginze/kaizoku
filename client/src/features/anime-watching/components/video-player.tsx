import React, { useState, useRef, useEffect } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
  SeekButton,
  useMediaState,
  useMediaRemote,
} from "@vidstack/react";
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { RotateCcw, RotateCw } from "lucide-react";
import { WatchInfo } from "@/types/watch";
import { useQuery } from "@tanstack/react-query";
import { getEpisodeSourcesOptions } from "../queries/get-episode-sources";
import { usePlayerControls } from "../contexts/player-controls-context";
import { SeekBackward10Icon, SeekForward10Icon } from "@vidstack/react/icons";
import { Button } from "@/components/ui/button";
import type { MediaPlayerInstance } from "@vidstack/react";
import { useWatchedEpisodesStore } from "../stores/watched-episodes-store";

type PlayerProps = {
  watchInfo: WatchInfo;
};

export const Player: React.FC<PlayerProps> = ({ watchInfo }) => {
  const { selectedServer } = usePlayerControls();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const remote = useMediaRemote(playerRef);
  const [currentTime, setCurrentTime] = useState(0);

  const {
    data: episodeSources,
    isLoading: episodeSourcesLoading,
    isError: episodeSourcesError,
  } = useQuery(
    getEpisodeSourcesOptions(
      selectedServer
        ? selectedServer.serverId
        : watchInfo.embeds.sub[0]?.serverId,
      watchInfo.currentEpisode
    )
  );

  const { updateRecentlyWatched } = useWatchedEpisodesStore();

  useEffect(() => {
    updateRecentlyWatched({
      _id: watchInfo.anime._id,
      idAnilist: watchInfo.anime.idAnilist,
      title: watchInfo.anime.title,
      coverImage: watchInfo.anime.coverImage,
      bannerImage: watchInfo.anime.bannerImage,
      episodeNumber: watchInfo.currentEpisode,
      totalEpisodes: watchInfo.availableEpisodes.length,
      watchedDuration: currentTime,
      totalDuration: watchInfo.anime.duration,
      latestWatchedEpisode: watchInfo.currentEpisode,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Handler for time updates
  const handleTimeUpdate = (detail: { currentTime: number }) => {
    setCurrentTime(detail.currentTime);
  };

  const noStreamingSources =
    watchInfo.embeds.sub.length === 0 && watchInfo.embeds.dub.length === 0;

  if (episodeSourcesLoading) {
    return (
      <MediaPlayer
        crossOrigin
        playsInline
        className="w-full bg-black md:h-[500px] h-[200px]"
        aspectRatio="16/9"
        load="eager"
        posterLoad="eager"
        streamType="on-demand"
        storage="storage-key"
        keyTarget="player"
        src={{
          src: "",
          type: "application/x-mpegurl",
        }}
      >
        <MediaProvider>
          <Poster
            className="vds-poster object-cover w-full h-full"
            src={
              watchInfo.anime.bannerImage ||
              watchInfo.anime.coverImage.extraLarge
            }
            alt=""
          />
        </MediaProvider>
        <DefaultAudioLayout icons={defaultLayoutIcons} />
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          slots={{
            captionButton: null,
            airPlayButton: null,
            googleCastButton: null,
            chaptersMenu: null,
          }}
        />
      </MediaPlayer>
    );
  }

  if (noStreamingSources) {
    return (
      <div className="w-full md:h-[500px] h-[200px] flex items-center justify-center bg-black text-white text-sm ">
        <div className="opacity-60">Content is currently being onboarded </div>
      </div>
    );
  }

  if (!episodeSources) {
    return (
      <div className="w-full md:h-[500px] h-[200px] flex items-center justify-center bg-black text-white text-sm">
        <div className="opacity-60">No episode sources available.</div>
      </div>
    );
  }

  if (episodeSourcesError) {
    return (
      <div className="w-full md:h-[500px] h-[200px] flex items-center justify-center bg-black text-white text-sm">
        <div className="opacity-60">Error loading episode sources.</div>
      </div>
    );
  }

  const params = new URLSearchParams({
    introStart: episodeSources.intro.start.toString(),
    introEnd: episodeSources.intro.end.toString(),
    outroStart: episodeSources.outro.start.toString(),
    outroEnd: episodeSources.outro.end.toString(),
  });

  // V2 Proxy URL with megacloud.club origin and headers
  const headers = JSON.stringify({
    Referer: "https://megacloud.club/",
    Origin: "https://megacloud.club",
  });

  const proxyUrl = `${
    import.meta.env.VITE_API_URL
  }/api/proxy/v2?url=${encodeURIComponent(
    episodeSources?.sources[0]?.url || ""
  )}&origin=${encodeURIComponent(
    "https://megacloud.club"
  )}&headers=${encodeURIComponent(headers)}`;

  const chaptersUrl = `${
    import.meta.env.VITE_API_URL
  }/api/anime/get-chapters-vtt?${params.toString()}`;

  // Check if intro/outro exist (both start and end are not 0)
  const hasIntro =
    episodeSources.intro.start !== 0 || episodeSources.intro.end !== 0;
  const hasOutro =
    episodeSources.outro.start !== 0 || episodeSources.outro.end !== 0;

  // Check if current time is within intro/outro range
  const isInIntro =
    hasIntro &&
    currentTime >= episodeSources.intro.start &&
    currentTime <= episodeSources.intro.end;
  const isInOutro =
    hasOutro &&
    currentTime >= episodeSources.outro.start &&
    currentTime <= episodeSources.outro.end;

  // Handlers to skip intro/outro
  const handleSkipIntro = () => {
    remote.seek(episodeSources.intro.end);
  };

  const handleSkipOutro = () => {
    remote.seek(episodeSources.outro.end);
  };

  return (
    <>
      <MediaPlayer
        ref={playerRef}
        crossOrigin
        playsInline
        onTimeUpdate={handleTimeUpdate}
        // title={`${watchInfo.anime.title.romaji} - Episode ${watchInfo.currentEpisode}`}
        className="w-full bg-black md:h-[500px] h-[200px] relative"
        aspectRatio="16/9"
        load="eager"
        posterLoad="eager"
        streamType="on-demand"
        storage="storage-key"
        keyTarget="player"
        src={{
          src: proxyUrl,
          type: "application/x-mpegurl",
        }}
      >
        <MediaProvider>
          <Poster
            className="vds-poster object-cover w-full h-full"
            src={
              watchInfo.anime.bannerImage ||
              watchInfo.anime.coverImage.extraLarge
            }
            alt=""
          />
          {episodeSources.intro && (
            <Track
              kind="chapters"
              src={chaptersUrl}
              default
              label="Skip Times"
            />
          )}
          {episodeSources.tracks[0]?.url && (
            <Track
              kind="subtitles"
              src={episodeSources.tracks[0]?.url}
              default
              label="English Subtitles"
            />
          )}
        </MediaProvider>

        <DefaultAudioLayout icons={defaultLayoutIcons} />
        <DefaultVideoLayout
          icons={{
            ...defaultLayoutIcons,
          }}
          slots={{
            captionButton: null,
            chaptersMenu: null,
          }}
        />

        {isInIntro && (
          <Button
            onClick={handleSkipIntro}
            variant={"outline"}
            className="absolute rounded-md bg-transparent bottom-20 right-5 z-50 h-[40px] hover:bg-transparent hover:text-white"
          >
            Skip Intro
          </Button>
        )}

        {isInOutro && (
          <Button
            onClick={handleSkipOutro}
            variant={"outline"}
            className="absolute rounded-md bg-transparent bottom-20 right-5 z-50 h-[40px] hover:bg-secondary hover:text-white"
          >
            Skip Outro
          </Button>
        )}
      </MediaPlayer>
    </>
  );
};
