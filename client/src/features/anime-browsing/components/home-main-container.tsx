import React from "react";
import { HomeFeaturedContainer } from "./home-featured-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRecentReleasesOptions, getTopRatedOptions } from "../queries";
import { Slideout } from "@/components/slideout";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "./anime-card";
import { ScheduleList } from "./schedule-list";
import { getTopMoviesOptions } from "../queries/get-search";
import { Loader } from "@/components/loader";
import { Spinner } from "@/components/ui/spinner";

type HomeMainContainerProps = {};

export const HomeMainContainer: React.FC<HomeMainContainerProps> = () => {
  const { data: recentReleases } = useSuspenseQuery(getRecentReleasesOptions());
  const { data: popularReleases } = useSuspenseQuery(getTopRatedOptions());
  const { data: topMovieReleases } = useSuspenseQuery(getTopMoviesOptions());

  return (
    <>
      <HomeFeaturedContainer />
      <Tabs defaultValue="recent" className="w-full">
        <div className="w-full flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
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
        <TabsContent value="recent">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
            {recentReleases.map((anime: any, index: number) => (
              <AnimeCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="popular">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
            {popularReleases.results.map((anime: any, index: number) => (
              <AnimeCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="movie">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
            {topMovieReleases.results.map((anime: any, index: number) => (
              <AnimeCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
