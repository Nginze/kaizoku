import { Footer } from "@/components/footer";
import { Layout } from "@/components/layout";
import { Navbar } from "@/components/navbar";
import FilterMainContainer from "@/features/anime-browsing/components/filter-main-container";
import { HomeSideContainer } from "@/features/anime-browsing/components/home-side-container";
import React, { Suspense } from "react";

type FilterProps = {};

export const Filter: React.FC<FilterProps> = () => {
  return (
    <>
      <Suspense fallback={<FilterFallback />}>
        <Layout
          nav={<Navbar />}
          main={<FilterMainContainer />}
          side={<HomeSideContainer />}
          footer={<Footer />}
        />
      </Suspense>
    </>
  );
};

const FilterFallback = () => {
  return (
    <div className="w-full h-screen flex  justify-center bg-[#191919]"></div>
  );
};
