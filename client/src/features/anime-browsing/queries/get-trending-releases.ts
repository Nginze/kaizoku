import { queryOptions } from "@tanstack/react-query";
import { animeKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";

export const getTrendingReleasesOptions = (filter: "daily" | "weekly") => {
  return queryOptions({
    queryKey: animeKeys.trending(filter),
    queryFn: () => client.getTrending(filter),
    staleTime: 1000 * 60 * 15, // 15 minutes - trending data updates frequently
  });
};
