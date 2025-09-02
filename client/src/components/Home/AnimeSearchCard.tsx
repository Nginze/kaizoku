import { Play, Star } from "lucide-react";
import React from "react";

type AnimeSearchCardProps = {
  anime: any;
};

export const AnimeSearchCard: React.FC<AnimeSearchCardProps> = ({ anime }) => {
  return (
    <div className="max-h-[350px] transition ease-linear duration-200 cursor-pointer ani-search-card group">
      <div className="relative">
        <Play
          className="ani-search-card-play z-20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition duration-300 group-hover:opacity-100 group-hover:scale-100"
          fill="white"
          size={40}
        />
        <img
          className="w-full h-[200px] object-cover"
          src={anime.coverImage.large}
        />
        <div className="bg-[#222222] gap-1 absolute top-0 left-0 bg-opacity-40 px-1.5 h-4 flex items-center justify-center rounded-br-md">
          <Star size={10} fill="#ffc107" color="#ffc107" />
          <span className="text-[11.5px]">{anime.meanScore / 10}</span>
        </div>
        <div
          className="absolute left-[-1px] right-[-1px] bottom-[-1px] top-0 bg-gradient-to-t from-[#202020] via-[#2020204a] to-transparent"
          aria-hidden="true"
        ></div>
      </div>
      <div className="bg-[#222222] flex flex-col gap-2 px-5 py-1.5 items-center relative h-[85px]">
        <span className="text-sm text-primary text-center line-clamp-2">
          {anime.title.english || anime.title.romanji || anime.title.native}
        </span>
        <span className="text-xs text-light opacity-70">Ep 12/12</span>
      </div>
    </div>
  );
};
