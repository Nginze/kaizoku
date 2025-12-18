import { Footer } from "@/components/footer";
import { Layout } from "@/components/layout";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { EpisodeGridContainer } from "@/features/anime-watching/components/episode-grid-container";
import { Player } from "@/features/anime-watching/components/video-player";
import { PlayerControls } from "@/features/anime-watching/components/video-player-controls";
import { WatchSideContainer } from "@/features/anime-watching/components/watch-side-container";
import { PlayerControlsProvider } from "@/features/anime-watching/contexts/player-controls-context";
import { getWatchInfoOptions } from "@/features/anime-watching/queries/get-watch-info";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { watch } from "fs";
import React, { Suspense } from "react";
import { useParams, useSearchParams } from "react-router";

type WatchProps = {};

export const Watch: React.FC<WatchProps> = () => {
  const { animeId } = useParams();
  const [searchParams] = useSearchParams();
  const epNo = searchParams.get("ep") || "1";

  const {
    data: watchInfo,
    isPending: watchInfoPending,
    isError: watchInfoError,
  } = useQuery(
    getWatchInfoOptions({
      animeId: animeId!,
      epNo: epNo,
    })
  );

  useDocumentTitle(
    `${watchInfo?.anime.title.romaji} - Episode ${watchInfo?.currentEpisode} English Subbed/Dubbed • Kaizoku`
  );

  if (watchInfoPending) {
    return (
      <div className="flex w-full h-screen bg-[#191919] flex-col gap-10  justify-center items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[500px]  " />
          <Skeleton className="h-4 w-[350px]  " />
          <Skeleton className="h-4 w-[200px]  " />
        </div>
      </div>
    );
  }

  if (watchInfoError || !watchInfo) {
    return (
      <div className="flex w-full h-screen bg-[#191919] flex-col gap-10  justify-center items-center">
        <div className="flex flex-col gap-2">
          <span className="text-white text-lg">Failed to load episode.</span>
        </div>
      </div>
    );
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
