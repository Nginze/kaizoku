import React from "react";
import { AnimeSideBarListItem } from "./anime-sidebar-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpandableContainer } from "@/components/expandable-container";
import { getPopularOptions, getTopAiringOptions } from "../queries";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

type HomeSideContainerProps = {};

const genres = [
  "Action",
  "Adventure",
  "Anti-Hero",
  "CGDCT",
  "College",
  "Comedy",
  "Drama",
  "Dub",
  "Ecchi",
  "Fantasy",
  "Gag Humor",
  "Game",
  "Harem",
  "Historical",
  "Horror",
  "Idol",
  "Isekai",
  "Iyashikei",
  "Josei",
  "Kids",
  "Magical Girl",
  "Martial Arts",
  "Mecha",
  "Military",
  "Movie",
  "Music",
  "Mythology",
  "Mystery",
  "Otaku",
  "Parody",
  "Police",
  "Psychological",
  "Racing",
  "Revenge",
  "Romance",
  "Rural",
  "Samurai",
  "School",
  "Sci-Fi",
  "Seinen",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Slice of Life",
  "Space",
  "Sports",
  "Super Power",
  "Supernatural",
  "Survival",
  "Suspense",
  "Time Travel",
  "Vampire",
  "Work",
];

export const HomeSideContainer: React.FC<HomeSideContainerProps> = () => {
  const years = Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 2025 - i);
  const { data: topAiringList } = useSuspenseQuery(getTopAiringOptions());

  return (
    <div className="flex flex-col w-full gap-3">
      <div className="flex flex-col gap-2 px-2 py-2 items-center bg-[#222222] ">
        <span className="w-full text-left text-xs opacity-50">
          Sign in to kaizen
        </span>
        <button className="bg-blue flex items-center w-full overflow-hidden border border-secondary">
          <div className="bg-white p-3">
            <img src="/icons/google.svg" className="w-5" />
          </div>
          <span className="w-full flex items-center justify-center text-sm">
            Continue with Google
          </span>
        </button>
        <button className="bg-gray-dark border border-secondary flex items-center w-full overflow-hidden">
          <div className="bg-secondary-2 p-3">
            <img src="/icons/anilist.svg" className="w-5" />
          </div>
          <span className="w-full flex items-center justify-center text-sm">
            Continue with Anilist
          </span>
        </button>
      </div>
      <div className="bg-[#222222] w-full">
        <div className="px-2 py-2 border-b border-secondary border-opacity-10">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm opacity-80">Season:</span>
              <Select>
                <SelectTrigger className="w-full rounded-sm">
                  <SelectValue placeholder="Fall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm opacity-80">Year:</span>
              <div className="flex items-center gap-3">
                <Select>
                  <SelectTrigger className="w-full rounded-sm">
                    <SelectValue placeholder="2024" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 overflow-y-auto">
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant={"default"}>Go</Button>
              </div>
            </div>
          </div>
        </div>
        <ExpandableContainer>
          <div className="grid grid-cols-2 gap-0.5 px-2 py-2 w-full">
            {genres.map((genre, index) => (
              <div
                key={index}
                className="flex items-center gap-3 cursor-pointer rounded-sm"
              >
                <Checkbox id={genre} className="hover:none" />
                <label
                  htmlFor={genre}
                  className="text-sm opacity-80 line-clamp-1"
                >
                  {genre}
                </label>
              </div>
            ))}
          </div>
        </ExpandableContainer>
        <div className="flex flex-col gap-2  w-full py-2 ">
          <span className="w-full text-center text-sm opacity-50 py-2 text-white">
            # Most Viewed
          </span>
          <Tabs defaultValue="today" className="w-full">
            <div className="w-full flex items-center justify-between">
              <TabsList className="w-full">
                <TabsTrigger className="w-full" value="today">
                  Today
                </TabsTrigger>
                <TabsTrigger className="w-full" value="week">
                  Week
                </TabsTrigger>
                <TabsTrigger className="w-full" value="month">
                  Month
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="today"
              className="px-2 flex flex-col gap-1 w-full"
            >
              {topAiringList?.results.slice(0, 8).map((anime, index) => (
                <AnimeSideBarListItem
                  ranking={index + 1}
                  anime={anime}
                  key={index}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
