import React from "react";
import { MediaPlayer, MediaProvider, Poster, Track } from "@vidstack/react";
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { WatchInfo } from "@/types/watch";
import { useQuery } from "@tanstack/react-query";
import { getEpisodeSourcesOptions } from "../queries/get-episode-sources";
import { usePlayerControls } from "../contexts/player-controls-context";

type PlayerProps = {
  watchInfo: WatchInfo;
};

export const Player: React.FC<PlayerProps> = ({ watchInfo }) => {
  const { selectedServer } = usePlayerControls();

  const {
    data: episodeSources,
    isLoading: episodeSourcesLoading,
    isError: episodeSourcesError,
  } = useQuery(
    getEpisodeSourcesOptions(
      selectedServer
        ? selectedServer.embedLink
        : watchInfo.embeds.sub[0]?.embedLink
    )
  );

  const noStreamingSources =
    watchInfo.embeds.sub.length === 0 && watchInfo.embeds.dub.length === 0;

  if (episodeSourcesLoading) {
    return (
      <MediaPlayer
        crossOrigin
        playsInline
        title={`${watchInfo.anime.title.romaji} - Episode ${watchInfo.currentEpisode}`}
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
            src={watchInfo.anime.bannerImage}
            alt=""
          />
        </MediaProvider>
        <DefaultAudioLayout icons={defaultLayoutIcons} />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    );
  }

  if (noStreamingSources || !episodeSources) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-black text-white">
        Content is currently being onboarded{" "}
      </div>
    );
  }
  if (episodeSourcesError) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-black text-white">
        Error loading episode sources.
      </div>
    );
  }

  const params = new URLSearchParams({
    introStart: episodeSources.intro.start.toString(),
    introEnd: episodeSources.intro.end.toString(),
    outroStart: episodeSources.outro.start.toString(),
    outroEnd: episodeSources.outro.end.toString(),
  });

  const proxyUrl = `http://localhost:8080/api/proxy/video?url=${encodeURIComponent(
    episodeSources?.sources[0]?.url || ""
  )}`;
  const chaptersUrl = `http://localhost:8080/api/anime/get-chapters-vtt?${params.toString()}`;

  return (
    <>
      <MediaPlayer
        crossOrigin
        playsInline
        title={`${watchInfo.anime.title.romaji} - Episode ${watchInfo.currentEpisode}`}
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
            src={watchInfo.anime.bannerImage}
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
          //   thumbnails="https://s.megastatics.com/thumbnails/d60530447d09b5b21e590776048d0284/thumbnails.vtt"
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
    </>
  );
};
