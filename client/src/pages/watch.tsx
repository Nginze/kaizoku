import { Footer } from "@/components/footer";
import { Layout } from "@/components/layout";
import { Navbar } from "@/components/navbar";
import { EpisodeGridContainer } from "@/features/anime-watching/components/episode-grid-container";
import { Player } from "@/features/anime-watching/components/video-player";
import { PlayerControls } from "@/features/anime-watching/components/video-player-controls";
import { WatchSideContainer } from "@/features/anime-watching/components/watch-side-container";
import { PlayerControlsProvider } from "@/features/anime-watching/contexts/player-controls-context";
import { getWatchInfoOptions } from "@/features/anime-watching/queries/get-watch-info";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { watch } from "fs";
import React, { Suspense } from "react";
import { useParams, useSearchParams } from "react-router";

type WatchProps = {};

export const Watch: React.FC<WatchProps> = () => {
  const { animeId } = useParams();
  const [searchParams] = useSearchParams();
  const epNo = searchParams.get("ep");

  const {
    data: watchInfo,
    isPending: watchInfoPending,
    isError: watchInfoError,
  } = useQuery(
    getWatchInfoOptions({
      animeId: animeId!,
      epNo: epNo ?? "1",
    })
  );

  if (watchInfoPending) {
    return <div>Loading...</div>;
  }

  if (watchInfoError || !watchInfo) {
    return <div>Error loading watch info.</div>;
  }

  return (
    <>
      <Layout
        nav={<Navbar />}
        main={
          <>
            <PlayerControlsProvider watchInfo={watchInfo}>
              <Player watchInfo={watchInfo} />
              <PlayerControls watchInfo={watchInfo} />
              <EpisodeGridContainer watchInfo={watchInfo} />
            </PlayerControlsProvider>
          </>
        }
        side={<WatchSideContainer watchInfo={watchInfo} />}
        footer={<Footer />}
      />
    </>
  );
};
