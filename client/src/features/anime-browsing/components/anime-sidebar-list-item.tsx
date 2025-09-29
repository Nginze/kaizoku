import { AnimeResult } from "@/types/anime";
import { ChartNoAxesColumn, Star } from "lucide-react";
import React from "react";

type AnimeSideBarListItemProps = {
  anime: AnimeResult;
};

export const AnimeSideBarListItem: React.FC<AnimeSideBarListItemProps> = ({
  anime,
}) => {
  return (
    <div className="flex items-center gap-3 cursor-pointer hover:bg-dark rounded-sm">
      <div className="min-h-[70px] w-[50px]">
        <img
          className="w-full h-full object-cover"
          src={anime.coverImage?.extraLarge}
        />
      </div>
      <div className="flex flex-col items-start">
        <div className="opacity-40 text-xs">#1</div>
        <div className="text-sm text-primary">
          {anime.title.romaji ||
            anime.title.english ||
            anime.title.native ||
            anime.title.userPreferred}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={10} fill="#ffc107" color="#ffc107" />
            <span className="text-sm opacity-55">
              {anime.averageScore! / 10}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ChartNoAxesColumn size={13} className="opacity-55" />
            <span className="text-sm opacity-55">{anime.popularity}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
