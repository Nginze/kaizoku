import { AnimeResult } from "@/types/anime";
import { ChartNoAxesColumn, Star } from "lucide-react";
import React from "react";
import formatPopularity from "../utils/format-popularity";
import formatRating from "../utils/format-rating";

type AnimeSideBarListItemProps = {
  anime: AnimeResult;
  ranking: number;
};

export const AnimeSideBarListItem: React.FC<AnimeSideBarListItemProps> = ({
  anime,
  ranking,
}) => {
  return (
    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary rounded-sm">
      <div className="h-[70px] min-w-[50px] w-[50px]">
        <img
          className="w-full h-full object-cover bg-secondary-2"
          src={anime.coverImage?.extraLarge}
        />
      </div>
      <div className="flex flex-col items-start">
        <div className="opacity-40 text-xs">#{ranking}</div>
        <div className="text-xs text-primary line-clamp-1">
          {anime.title.romaji ||
            anime.title.english ||
            anime.title.native ||
            anime.title.userPreferred}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={10} fill="#ffc107" color="#ffc107" />
            <span className="text-xs opacity-55">
              {formatRating(anime.averageScore!)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ChartNoAxesColumn size={13} className="opacity-55" />
            <span className="text-xs opacity-55">
              {formatPopularity(anime.popularity!)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
