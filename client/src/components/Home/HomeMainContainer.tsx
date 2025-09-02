import React from "react";
import { HomeFeaturedContainer } from "./HomeFeaturedContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Clock } from "lucide-react";
import { Slideout } from "../Slideout";
import { Button } from "../ui/button";
import { AnimeSearchCard } from "./AnimeSearchCard";
import { api } from "@/api";
import { QUERY_KEYS } from "@/constants/query-keys";
import { useQuery } from "@tanstack/react-query";

type HomeMainContainerProps = {};

export const HomeMainContainer: React.FC<HomeMainContainerProps> = () => {
  const { data: testDb } = useQuery({
    queryKey: QUERY_KEYS.allAnime,
    queryFn: async () => {
      return (await api.get("/db.json")).data;
    },
  });

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
            {testDb?.anime.map((anime: any, index: number) => (
              <AnimeSearchCard anime={anime} key={index} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};
