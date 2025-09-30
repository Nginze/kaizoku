import { useSuspenseQuery } from "@tanstack/react-query";
import { get } from "http";
import React from "react";
import { getWatchInfoOptions } from "../queries/get-watch-info";
import { useParams, useSearchParams } from "react-router";
import { watch } from "fs";

type PlayerControlsProps = {};

export const PlayerControls: React.FC<PlayerControlsProps> = () => {
  const { animeId } = useParams();
  const [searchParams] = useSearchParams();
  const epNo = searchParams.get("ep");

  const { data: watchInfo } = useSuspenseQuery(
    getWatchInfoOptions({ animeId: animeId!, epNo: epNo ?? "1" })
  );

  return (
    <div className="bg-[#222222] flex w-full">
      <div className="flex w-full h-full">
        <div className="w-1/4 flex items-center px-3 py-4 text-xs opacity-55 bg-dark border-r border-secondary-1 border-dashed">
          <div className=" mx-auto text-center">
            <div>
              You are watching{" "}
              <span className="font-bold">
                Episode {watchInfo.currentEpisode}
              </span>{" "}
              <br />
            </div>
            <div className="font-light opacity-50">
              (if the current server doesn't work, please refresh or try
              another)
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full px-4">
          <div className="flex flex-col">
            <div className="flex items-center flex-1 h-1 px-3 py-4 border-b border-secondary border-dashed gap-6">
              <div className="flex text-sm gap-4">
                <div className="opacity-70">SUB: </div>
              </div>
              <div className="flex items-center gap-0.5">
                {watchInfo.embeds.sub.map((embed, index) => (
                  <button
                    key={index}
                    className="px-3 py-1.5 text-white text-sm bg-secondary"
                  >
                    <span className="opacity-60">
                      {embed.serverName || `HD-${embed.serverIdx}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center flex-1 h-1 px-3 py-4  gap-6">
              <div className="flex text-sm gap-4">
                <div className="opacity-70">DUB: </div>
              </div>
              <div className="flex items-center gap-0.5">
                {watchInfo.embeds.dub.map((embed, index) => (
                  <button
                    key={index}
                    className="px-3 py-1.5 text-white text-sm bg-secondary"
                  >
                    <span className="opacity-60">
                      {embed.serverName || `HD-${embed.serverIdx}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
