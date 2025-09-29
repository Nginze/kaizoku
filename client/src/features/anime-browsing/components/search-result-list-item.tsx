import { AnimeResult } from "@/types/anime";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

type SearchResultListItemProps = {
  anime: AnimeResult;
};

export const SearchResultListItem: React.FC<SearchResultListItemProps> = ({
  anime,
}) => {
  return (
    <div className="flex items-start gap-3 cursor-pointer hover:bg-secondary-2  rounded-sm">
      <div className="h-[70px] w-[55px]">
        <img
          className="w-full h-full object-cover"
          src={anime.coverImage?.extraLarge}
        />
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="text-sm text-primary line-clamp-2">
          {anime.title.romaji}
        </div>
        <div className="text-xs line-clamp-2 opacity-80">
          {anime.title.english || anime.title.userPreferred}
        </div>
        <div className="opacity-40 text-xs">
          <span>
            {anime.format} • {anime.seasonYear}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SearchResultListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-start gap-3 cursor-pointer rounded-sm">
      <Skeleton className="h-[70px] w-[55px] bg-secondary-2" />
      <div className="flex flex-col items-start gap-1 flex-1">
        <Skeleton className="h-4 w-3/4 bg-secondary-2" />
        <Skeleton className="h-3 w-full bg-secondary-2" />
        <Skeleton className="h-3 w-1/2 bg-secondary-2" />
      </div>
    </div>
  );
};
