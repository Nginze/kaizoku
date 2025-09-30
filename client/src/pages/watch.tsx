import { Footer } from "@/components/footer";
import { Layout } from "@/components/layout";
import { Navbar } from "@/components/navbar";
import { EpisodeGridContainer } from "@/features/anime-watching/components/episode-grid-container";
import { Player } from "@/features/anime-watching/components/video-player";
import { PlayerControls } from "@/features/anime-watching/components/video-player-controls";
import { WatchSideContainer } from "@/features/anime-watching/components/watch-side-container";
import React, { Suspense } from "react";

type WatchProps = {};

export const Watch: React.FC<WatchProps> = () => {
  return (
    <>
      <Suspense fallback={null}>
        <Layout
          nav={<Navbar />}
          main={
            <>
              <Player />
              <PlayerControls />
              <EpisodeGridContainer />
            </>
          }
          side={<WatchSideContainer />}
          footer={<Footer />}
        />
      </Suspense>
    </>
  );
};
