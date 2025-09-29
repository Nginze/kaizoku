import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChartNoAxesColumn, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getFeaturedListOptions } from "../queries/get-featured-list";

type HomeFeaturedContainerProps = {};

export const HomeFeaturedContainer: React.FC<
  HomeFeaturedContainerProps
> = () => {
  const { data: featuredList } = useSuspenseQuery(getFeaturedListOptions());

  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % featuredList.length);
    }, 50000);

    return () => {
      clearInterval(interval);
    };
  }, [featuredList.length]);

  return (
    <div className="relative w-full h-[165px]">
      {featuredList.map((anime, index: number) => (
        <div
          key={index}
          className={cn(
            "w-full h-full overflow-hidden flex items-center gap-5 absolute inset-0 transition duration-1000",
            currentSlideIdx === index ? "opacity-100" : "opacity-0",
          )}
        >
          <img
            src={anime.bannerImage}
            className="w-full max-h-full scale-110 blur-lg opacity-20 object-cover absolute"
          />
          <div className="min-w-[120px] h-full">
            <img
              className="w-full h-full object-cover"
              src={anime.coverImage?.extraLarge}
            />
          </div>
          <div className="flex flex-col items-start justify-center pr-4  relative h-full">
            <div className="text-lg leading-[2.5rem]">
              {anime.title.romaji ||
                anime.title.english ||
                anime.title.native ||
                anime.title.userPreferred}
            </div>
            <div className="flex flex-col items-start gap-2 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={13} fill="white" />
                  <span className="text-sm">{anime.averageScore! / 10}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChartNoAxesColumn size={13} />
                  <span className="text-sm">{anime.popularity}</span>
                </div>
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: anime.description as TrustedHTML,
                }}
                className="text-sm opacity-70 line-clamp-2"
              ></div>
            </div>
            <div className="w-full text-xs opacity-45 flex items-center justify-between">
              <span>{anime.genres?.join(", ")}</span>

              <div className="flex justify-center items-center">
                {featuredList.map((_: any, index: number) => (
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
