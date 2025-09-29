import React, { Suspense } from "react";
import { Layout } from "../components/layout";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomeMainContainer } from "@/features/anime-browsing/components/home-main-container";
import { HomeSideContainer } from "@/features/anime-browsing/components/home-side-container";

type HomeProps = {};

export const Home: React.FC<HomeProps> = () => {
  return (
    <>
      <Suspense fallback={null}>
        <Layout
          nav={<Navbar />}
          main={<HomeMainContainer />}
          side={<HomeSideContainer />}
          footer={<Footer />}
        />
      </Suspense>
    </>
  );
};
