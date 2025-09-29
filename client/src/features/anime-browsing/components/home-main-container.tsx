import React from "react";
import { HomeFeaturedContainer } from "./home-featured-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRecentReleasesOptions } from "../queries";
import { Slideout } from "@/components/slideout";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "./anime-card";

type HomeMainContainerProps = {};

export const HomeMainContainer: React.FC<HomeMainContainerProps> = () => {
  const { data: recentReleases } = useSuspenseQuery(getRecentReleasesOptions());

  return (
    <>
      <HomeFeaturedContainer />
      <Tabs defaultValue="all" className="w-full">
        <div className="w-full flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sub">Sub</TabsTrigger>
            <TabsTrigger value="dub">Dub</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="movie">Movie</TabsTrigger>
          </TabsList>
          <Slideout
            side="left"
            trigger={
              <Button>
                <div className="flex items-center gap-2">
                  <Clock />
                  <span>Schedule</span>
                </div>
              </Button>
            }
          >
            <div>Future Schedule here</div>
          </Slideout>
        </div>
        <TabsContent value="all">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5">
            {recentReleases.map((anime: any, index: number) => (
              <AnimeCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
