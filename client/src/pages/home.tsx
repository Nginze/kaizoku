import React, { Suspense } from "react";
import { Layout } from "../components/layout";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomeMainContainer } from "@/features/anime-browsing/components/home-main-container";
import { HomeSideContainer } from "@/features/anime-browsing/components/home-side-container";
import { Loader } from "@/components/loader";
import { Spinner } from "@/components/ui/spinner";

type HomeProps = {};

export const Home: React.FC<HomeProps> = () => {
  return (
    <>
      <Suspense fallback={<HomeFallback />}>
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

const HomeFallback = () => {
  return (
    <div className="w-full h-screen flex  justify-center bg-[#191919]">
      <div className="mt-20">
        <Spinner />
      </div>
    </div>
  );
};
