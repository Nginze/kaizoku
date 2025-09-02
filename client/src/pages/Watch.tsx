import ExpandableContainer from "@/components/ExpandableContainer";
import { Footer } from "@/components/Footer";
import { Layout } from "@/components/Layout";
import { Navbar } from "@/components/Navbar";
import { EpisodeGridContainer } from "@/components/Watch/EpisodeGridContainer";
import { Player } from "@/components/Watch/Video/Player";
import { PlayerControls } from "@/components/Watch/Video/PlayerControls";
import { WatchSideContainer } from "@/components/Watch/WatchSideContainer";
import React from "react";

type WatchProps = {};

export const Watch: React.FC<WatchProps> = () => {
  return (
    <>
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
    </>
  );
};
