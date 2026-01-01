import { useSuspenseQuery } from "@tanstack/react-query";
import { get } from "http";
import React from "react";
import { getWatchInfoOptions } from "../queries/get-watch-info";
import { useParams, useSearchParams } from "react-router";
import { watch } from "fs";
import { WatchInfo } from "@/types/watch";
import { usePlayerControls } from "../contexts/player-controls-context";
import { cn } from "@/lib/utils";
import { BxBxsCaptions } from "@/lib/icons/bx-captions";
import { MajesticonsMicrophone } from "@/lib/icons/mj-microphone";

type PlayerControlsProps = {
  watchInfo: WatchInfo;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  watchInfo,
}) => {
  const { selectedServer, setSelectedServer } = usePlayerControls();

  const handleServerSelect = (
    embed: WatchInfo["embeds"]["sub"][0] | WatchInfo["embeds"]["dub"][0]
  ) => {
    setSelectedServer({
      serverIdx: embed.serverIdx,
      serverName: embed.serverName,
      embedLink: embed.embedLink,
      epNo: watchInfo.currentEpisode,
      serverId: embed.serverId,
      type: watchInfo.embeds.sub.includes(embed) ? "SUB" : "DUB",
    });
  };

  return (
    <div className="bg-[#222222] flex w-full">
      <div className="flex flex-col md:flex-row w-full h-full">
        <div className="md:w-1/4 w-full  flex items-center px-3 md:py-4 py-2 md:text-xs text-[11px]  opacity-55 bg-dark border-r border-secondary-1 border-dashed">
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
          <div className="flex flex-col h-full">
            <div
              className={cn(
                "flex items-center flex-1 h-1 px-3 py-4 gap-6",
                watchInfo.hasDubbing && "border-b border-secondary border-dashed"
              )}
            >
              <div className="flex items-center text-sm gap-2">
                <BxBxsCaptions className="md:text-lg text-md" />
                <div className="opacity-70 text-xs md:text-md">SUB: </div>
              </div>
              <div className="flex items-center gap-0.5">
                {watchInfo.embeds.sub.map((embed, index) => (
                  <button
                    onClick={() => handleServerSelect(embed)}
                    key={index}
                    className={cn(
                      "px-3 py-1.5 text-white md:text-sm text-xs bg-secondary hover:bg-secondary-1 active:bg-secondary",
                      selectedServer?.serverId === embed.serverId &&
                        "bg-primary hover:bg-primary active:bg-primary text-black"
                    )}
                  >
                    <span className="opacity-60">{`HD-${index + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
            {watchInfo.hasDubbing && (
              <div className="flex items-center flex-1 h-1 px-3 py-4  gap-6">
                <div className="flex items-center text-sm gap-2">
                  <MajesticonsMicrophone className="md:text-lg text-md" />
                  <div className="opacity-70 md:text-md text-xs">DUB: </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {watchInfo.embeds.dub.map((embed, index) => (
                    <button
                      onClick={() => handleServerSelect(embed)}
                      key={index}
                      className={cn(
                        "px-3 py-1.5 text-white md:text-sm text-xs bg-secondary hover:bg-secondary-1 active:bg-secondary",
                        selectedServer?.serverId === embed.serverId &&
                          "bg-primary hover:bg-primary active:bg-primary text-black"
                      )}
                    >
                      <span className="opacity-60">{`HD-${index + 1}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
