import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimeCard } from "./anime-card";
import { useSearchParams } from "react-router";
import { getSearchOptions } from "../queries";

type Props = {};

export default function FilterMainContainer({}: Props) {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q");

  const { data: searchResults } = useSuspenseQuery(
    getSearchOptions({ q: searchQuery || "" })
  );

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-center py-2 bg-secondary">
        <p className="text-lg">Search results for "{searchQuery}"</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
        {searchResults.results.map((anime: any, index: number) => (
          <AnimeCard anime={anime} key={index} />
        ))}
      </div>
    </div>
  );
}
