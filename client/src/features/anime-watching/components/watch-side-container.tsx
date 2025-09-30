import { ExpandableContainer } from "@/components/expandable-container";
import { useSuspenseQuery } from "@tanstack/react-query";
import React from "react";
import { useParams, useSearchParams } from "react-router";
import { getWatchInfoOptions } from "../queries/get-watch-info";
import { watch } from "fs";

type WatchSideContainerProps = {};

export const WatchSideContainer: React.FC<WatchSideContainerProps> = () => {
  const { animeId } = useParams();
  const [searchParams] = useSearchParams();
  const epNo = searchParams.get("ep");

  const { data: watchInfo } = useSuspenseQuery(
    getWatchInfoOptions({
      animeId: animeId!,
      epNo: epNo ?? "1",
    })
  );

  return (
    <div className="bg-[#222222] flex flex-col gap-3 py-1">
      <div className="w-full px-2 py-2">
        <img
          className="object-contain w-full"
          src={watchInfo.anime.coverImage?.extraLarge}
        />
      </div>
      <div className="w-full px-2 flex flex-col gap-2">
        <div className="">{watchInfo.anime.title.romaji}</div>
        <div className="text-sm opacity-60 line-clamp-2">
          {watchInfo.anime.title.english || watchInfo.anime.title.userPreferred}
        </div>
      </div>
      <div className="flex gap-2 px-2 py-2">
        <div className="bg-white text-black px-2 py-0.5 text-xs">None</div>
        <div className="bg-yellow text-black px-2 py-0.5 text-xs ">HD</div>
        <div className="bg-dark px-2 py-0.5 text-xs">
          {watchInfo.totalAvailableEpisodes}
        </div>
      </div>
      <ExpandableContainer maxHeight="h-[300px]" minHeight="h-[50px]">
        <div
          dangerouslySetInnerHTML={{
            __html: watchInfo.anime.description as TrustedHTML,
          }}
          className="text-xs px-2 opacity-30 h-32 overflow-x-hidden overflow-y-auto"
        ></div>
        <div className="w-full px-2 py-4">
          <div className="grid grid-cols-5 gap-y-1.5 text-xs">
            <div className="opacity-60 col-span-2">Type: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              {watchInfo.anime.format}
            </div>

            <div className="opacity-60 col-span-2">Premiered: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              {watchInfo.anime.season} {watchInfo.anime.seasonYear}
            </div>

            <div className="opacity-60 col-span-2">Genre: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              {watchInfo.anime.genres?.slice(0, 3).join(", ")}
            </div>

            <div className="opacity-60 col-span-2">Date aired: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              {watchInfo.anime.seasonYear}
            </div>

            <div className="opacity-60 col-span-2">Status: </div>
            <div className="opacity-60 col-span-3 text-primary-1">{watchInfo.anime.status}</div>

            <div className="opacity-60 col-span-2">MAL: </div>
            <div className="opacity-60 col-span-3 text-primary-1">{watchInfo.anime.idMal}</div>

            {/* <div className="opacity-60 col-span-2">Studios: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              {watchInfo.anime.tags
                ?.filter((tag) => tag.category === "studio")
                .slice(0, 3)
                .map((tag) => tag.name)
                .join(", ")}
            </div> */}
          </div>
        </div>
      </ExpandableContainer>
    </div>
  );
};
