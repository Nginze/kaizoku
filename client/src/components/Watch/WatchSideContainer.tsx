import React from "react";
import ExpandableContainer from "../ExpandableContainer";

type WatchSideContainerProps = {};

export const WatchSideContainer: React.FC<WatchSideContainerProps> = () => {
  return (
    <div className="bg-[#222222] flex flex-col gap-3 py-1">
      <div className="w-full px-2 py-2">
        <img
          className="object-contain w-full"
          src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-CXtrrkMpJ8Zq.png"
        />
      </div>
      <div className="w-full px-2 flex flex-col gap-2">
        <div className="">2.5-jigen no Ririsa</div>
        <div className="text-sm opacity-60 line-clamp-2">
          2.5 Dimensional Seduction; 2.5-jigen no Yuuwaku, Ririsa of 2.5
          Dimension ; 2.5次元の誘惑〈りりさ〉 2.5 Dimensional Seduction
        </div>
      </div>
      <div className="flex gap-2 px-2 py-2">
        <div className="bg-white text-black px-2 py-0.5 text-xs">None</div>
        <div className="bg-yellow text-black px-2 py-0.5 text-xs ">HD</div>
        <div className="bg-dark px-2 py-0.5 text-xs">24</div>
      </div>
      <ExpandableContainer maxHeight="h-[300px]" minHeight="h-[50px]">
        <div className="text-xs px-2 opacity-30 h-32 overflow-x-hidden overflow-y-auto">
          "I have no interest in real girls!" So claims Okumura, the president
          of the school's manga club. He's your typical otaku, obsessed with a
          sexy (fictional) 2D manga character known as Lilliel. Then the new
          school year starts, and a (real!) 3D girl named Lilysa whose passion
          is cosplay joins the club. Lilysa convinces Okumura to become her
          photographer—and guess who her favorite manga character is? Not only
          that, but Lilysa is into modeling the fetishy stuff! The boundaries
          between 2D and 3D start to blur as this hot-blooded romantic comedy
          unfolds.
        </div>
        <div className="w-full px-2 py-4">
          <div className="grid grid-cols-5 gap-y-1.5 text-xs">
            <div className="opacity-60 col-span-2">Type: </div>
            <div className="opacity-60 col-span-3 text-primary-1">TV</div>

            <div className="opacity-60 col-span-2">Premiered: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              Summer 2024
            </div>

            <div className="opacity-60 col-span-2">Genre: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              Comedy, Ecchi
            </div>

            <div className="opacity-60 col-span-2">Date aired: </div>
            <div className="opacity-60 col-span-3 text-primary-1">2024</div>

            <div className="opacity-60 col-span-2">Status: </div>
            <div className="opacity-60 col-span-3 text-primary-1">Ongoing</div>

            <div className="opacity-60 col-span-2">MAL: </div>
            <div className="opacity-60 col-span-3 text-primary-1">1</div>

            <div className="opacity-60 col-span-2">Studios: </div>
            <div className="opacity-60 col-span-3 text-primary-1">
              J.C.Staff
            </div>
          </div>
        </div>
      </ExpandableContainer>
    </div>
  );
};
