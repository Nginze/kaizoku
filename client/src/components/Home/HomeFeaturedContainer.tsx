import { api } from "@/api";
import { QUERY_KEYS } from "@/constants/query-keys";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesColumn, Star } from "lucide-react";
import React, { useEffect, useState } from "react";

type HomeFeaturedContainerProps = {};

export const HomeFeaturedContainer: React.FC<HomeFeaturedContainerProps> = () => {
  const { data: testDb } = useQuery({
    queryKey: QUERY_KEYS.featuredAnime,
    queryFn: async () => {
      return (await api.get("/db.json")).data;
    },
  });

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % testDb?.featured.length);
    }, 50000);

    return () => {
      clearInterval(interval);
    };
  }, [testDb?.featured.length]);

  console.log(currentSlideIdx);

  return (
    <div className="relative w-full h-[185px]">
      {testDb?.featured.map((anime: any, index: number) => (
        <div
          key={index}
          className={cn(
            "w-full h-full overflow-hidden flex items-center gap-5 absolute inset-0 transition duration-1000",
            currentSlideIdx === index ? "opacity-100" : "opacity-0"
          )}
        >
          <img
            src={anime.img}
            className="w-full max-h-full scale-110 blur-lg opacity-20 object-cover absolute"
          />
          <div className="min-w-[140px] h-full">
            <img className="w-full h-full object-cover" src={anime.img} />
          </div>
          <div className="flex flex-col items-start pr-4 gap-1.5 relative">
            <div className="text-2xl leading-[2.5rem]">{anime.title}</div>
            <div className="flex flex-col items-start gap-2 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={13} fill="white" />
                  <span className="text-sm">8.34</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChartNoAxesColumn size={13} />
                  <span className="text-sm">108,899</span>
                </div>
              </div>
              <div className="text-sm opacity-70 line-clamp-2">
                {anime.desc}
              </div>
            </div>
            <div className="w-full text-xs opacity-45 flex items-center justify-between">
              {anime.genre}

              <div className="flex justify-center items-center">
                {testDb?.featured.map((_: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setCurrentSlideIdx(index)}
                    className={`h-1 w-3 mr-1 cursor-pointer  ${
                      index === currentSlideIdx ? "bg-white" : "bg-gray"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
