import React, { Suspense } from "react";
import { Layout } from "../components/layout";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { HomeMainContainer } from "@/features/anime-browsing/components/home-main-container";
import { HomeSideContainer } from "@/features/anime-browsing/components/home-side-container";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

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
  return (
    <div className="flex w-full h-screen bg-[#191919] flex-col gap-10  justify-center items-center">
      <Spinner />
      {/* <img src="/logo/pickachu-loader.gif" alt="Loading..." className="w-20" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-[250px]  " />
          <Skeleton className="h-4 w-[100px]  " />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-[50px]  " />
          <Skeleton className="h-4 w-[200px]  " />
        </div>
      </div> */}
    </div>
  );
};
