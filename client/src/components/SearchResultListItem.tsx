import React from "react";

type SearchResultListItemProps = {
  anime: any;
};

export const SearchResultListItem: React.FC<SearchResultListItemProps> = ({
  anime,
}) => {
  return (
    <div className="flex items-start gap-3 cursor-pointer hover:bg-secondary-2  rounded-sm">
      <div className="h-[55px] w-[45px]">
        <img className="w-full h-full object-cover" src={anime.img} />
      </div>
      <div className="flex flex-col items-start gap-2">
        <div className="text-md text-primary">{anime.title}</div>
        <div className="opacity-40 text-xs">{anime.genre}</div>
      </div>
    </div>
  );
};
