import React, { Suspense } from "react";
import { Layout } from "../components/layout";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomeMainContainer } from "@/features/anime-browsing/components/home-main-container";
import { HomeSideContainer } from "@/features/anime-browsing/components/home-side-container";
import { Loader } from "@/components/loader";
import { Spinner } from "@/components/ui/spinner";
import { useDocumentTitle } from "@/hooks/use-document-title";

type HomeProps = {};

export const Home: React.FC<HomeProps> = () => {
  useDocumentTitle("Kaizoku - Watch Free Anime Online • Stream HD");
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
  return <Layout nav={null} main={null} side={null} footer={null} />;
};
