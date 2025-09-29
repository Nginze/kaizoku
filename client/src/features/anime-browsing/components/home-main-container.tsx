import React from "react";
import { HomeFeaturedContainer } from "./home-featured-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRecentReleasesOptions } from "../queries";
import { Slideout } from "@/components/slideout";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "./anime-card";
import { ScheduleList } from "./schedule-list";

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
            className="p-0 w-[350px]"
            trigger={
              <Button>
                <div className="flex items-center gap-2">
                  <Clock />
                  <span>Schedule</span>
                </div>
              </Button>
            }
          >
            <ScheduleList />
          </Slideout>
        </div>
        <TabsContent value="all">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
            {recentReleases.map((anime: any, index: number) => (
              <AnimeCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
