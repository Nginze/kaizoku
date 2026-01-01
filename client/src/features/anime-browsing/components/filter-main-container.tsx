import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimeCard } from "./anime-card";
import { useSearchParams } from "react-router";
import { getSearchOptions } from "../queries";
import { capitalizeFirstLetter } from "@/lib/utils";
import { AnimeSearchFilters } from "@/types/anime";

type Props = {};

export default function FilterMainContainer({}: Props) {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q");

  const parts: string[] = [];
  if (searchQuery) parts.push(searchQuery);
  const season = searchParams
    .get("season")
    ?.toUpperCase() as AnimeSearchFilters["season"];
  if (season) parts.push(season);
  const year = searchParams.get("year") as AnimeSearchFilters["year"];
  if (year) parts.push(year);
  const genresParam = searchParams.get("genres") as AnimeSearchFilters["tags"];
  if (genresParam) {
    const decoded = decodeURIComponent(genresParam);
    const genres = decoded
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    parts.push(...genres);
  }
  const searchLabel = parts
    .map((part) => capitalizeFirstLetter(part))
    .join(" + ");

  const { data: searchResults } = useSuspenseQuery(
    getSearchOptions({
      q: searchQuery || "",
      season: season,
      year: year,
      tags: genresParam ? decodeURIComponent(genresParam) : "",
    })
  );

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-center py-2 bg-gray-dark border border-secondary-2">
        <p className="text-lg">Search results for "{searchLabel}"</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))]  md:grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1">
        {searchResults.results.map((anime: any, index: number) => (
          <AnimeCard anime={anime} key={index} />
        ))}
      </div>
    </div>
  );
}
