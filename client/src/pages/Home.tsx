import React from "react";
import { Layout } from "../components/Layout";
import { Navbar } from "@/components/Navbar";
import { HomeMainContainer } from "@/components/Home/HomeMainContainer";
import { HomeSideContainer } from "@/components/Home/HomeSideContainer";
import { Footer } from "@/components/Footer";

type HomeProps = {};

export const Home: React.FC<HomeProps> = () => {
  return (
    <>
      <Layout
        nav={<Navbar />}
        main={<HomeMainContainer />}
        side={<HomeSideContainer />}
        footer={<Footer />}
      />
    </>
  );
};
