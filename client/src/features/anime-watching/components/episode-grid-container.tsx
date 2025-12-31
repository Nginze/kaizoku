import React, { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { getWatchInfoOptions } from "../queries/get-watch-info";
import { WatchInfo } from "@/types/watch";
import { cn } from "@/lib/utils";

type EpisodeGridContainerProps = {
  watchInfo: WatchInfo;
};

const EPISODES_PER_RANGE = 100;

export const EpisodeGridContainer: React.FC<EpisodeGridContainerProps> = ({
  watchInfo,
}) => {
  // const { animeId } = useParams();

  const [searchParams] = useSearchParams();
  const epNo = searchParams.get("ep");
  const [searchQuery, setSearchQuery] = useState("");

  // const { data: watchInfo } = useSuspenseQuery(
  //   getWatchInfoOptions({ animeId: animeId!, epNo: epNo ?? "1" })
  // );

  const navigate = useNavigate();

  const totalEpisodes =
    watchInfo.anime.episodes || watchInfo.totalAvailableEpisodes || 0;
  const showRangeSelector = totalEpisodes > EPISODES_PER_RANGE;

  const episodeRanges = useMemo(() => {
    const ranges: string[] = [];
    for (let i = 1; i <= totalEpisodes; i += EPISODES_PER_RANGE) {
      const start = i;
      const end = Math.min(i + EPISODES_PER_RANGE - 1, totalEpisodes);
      ranges.push(`${start}-${end}`);
    }
    !showRangeSelector ? ranges.push("1-100") : null;
    return ranges;
  }, [totalEpisodes]);

  // Determine initial range based on episode number from search params
  const getInitialRange = () => {
    if (!epNo) return episodeRanges[0] || "1-100";

    const epNumber = Number(epNo);
    const rangeIndex = Math.floor((epNumber - 1) / EPISODES_PER_RANGE);
    const start = rangeIndex * EPISODES_PER_RANGE + 1;
    const end = Math.min(start + EPISODES_PER_RANGE - 1, totalEpisodes);
    const calculatedRange = `${start}-${end}`;

    // Return the calculated range if it exists in episodeRanges, otherwise first range
    return episodeRanges.includes(calculatedRange) ? calculatedRange : episodeRanges[0] || "1-100";
  };

  const [selectedRange, setSelectedRange] = useState(getInitialRange());

  const currentEpisodes = useMemo(() => {
    // Parse the selected range (e.g., "0-100" or "101-200")
    const [rangeStart, rangeEnd] = selectedRange.split("-").map(Number);

    // Filter episodes to only include those within the selected range
    return watchInfo.availableEpisodes.filter(
      (ep) => ep >= rangeStart && ep <= rangeEnd
    );
  }, [watchInfo.availableEpisodes, selectedRange]);

  const filteredEpisodes = useMemo(() => {
    if (!searchQuery) return currentEpisodes;

    const fuse = new Fuse(currentEpisodes, {
      includeScore: true,
      threshold: 0.3,
      keys: ["toString()"],
    });

    const searchTerms =
      searchQuery.toLowerCase().match(/\d+|episode|ep/g) || [];
    const episodeNumber = searchTerms.find((term) => !isNaN(Number(term)));

    if (episodeNumber) {
      return currentEpisodes.filter((ep) => ep === Number(episodeNumber));
    }

    return fuse.search(searchQuery).map((result) => result.item);
  }, [currentEpisodes, searchQuery]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Select
          defaultValue={selectedRange || "1-100"}
          value={selectedRange}
          onValueChange={setSelectedRange}
          disabled={!showRangeSelector}
        >
          <SelectTrigger
            defaultValue={selectedRange || "1-100"}
            className="w-[180px]"
          >
            <SelectValue
              defaultValue={selectedRange || "1-100"}
              placeholder={`1-${totalEpisodes}`}
            />
          </SelectTrigger>
          <SelectContent>
            {episodeRanges.map((range) => (
              <SelectItem key={range} value={range}>
                {range}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="border border-secondary w-20">
          <Input
            placeholder="Ep #"
            className="bg-[#141414] rounded-none text-sm w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(45px,1fr))] gap-1 overflow-auto h-auto max-h-[180px] py-1">
        {filteredEpisodes.map((epNumber) => (
          <button
            onClick={() =>
              navigate(`/watch/${watchInfo.anime._id}?ep=${epNumber}`)
            }
            key={epNumber}
            className={cn(
              "bg-secondary-2 py-1 max-h-[40px] text-sm  hover:bg-secondary-1 active:bg-secondary",
              Number(epNo) === epNumber &&
                "bg-primary hover:bg-primary active:bg-primary text-black"
            )}
          >
            <span className="opacity-60">{epNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
