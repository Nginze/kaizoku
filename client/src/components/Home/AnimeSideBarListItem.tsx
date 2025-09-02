import { ChartNoAxesColumn, Star, User } from "lucide-react";
import React from "react";

type AnimeSideBarListItemProps = {};

export const AnimeSideBarListItem: React.FC<AnimeSideBarListItemProps> = () => {
  return (
    <div className="flex items-center gap-3 cursor-pointer hover:bg-dark rounded-sm">
      <div className="min-h-[70px] w-[50px]">
        <img
          className="w-full h-full object-cover"
          src="https://static.kuroiru.co/webp/1496/147108.webp"
        />
      </div>
      <div className="flex flex-col items-start">
        <div className="opacity-40 text-xs">#1</div>
        <div className="text-sm text-primary">Chainsaw Man</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star size={10} fill="#ffc107" color="#ffc107" />
            <span className="text-sm opacity-55">8.34</span>
          </div>
          <div className="flex items-center gap-1">
            <ChartNoAxesColumn size={13} className="opacity-55" />
            <span className="text-sm opacity-55">108,899</span>
          </div>
        </div>
      </div>
    </div>
  );
};
