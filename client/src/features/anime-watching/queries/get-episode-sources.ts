import { client } from "@/lib/api";
import { watchKeys } from "@/lib/query-keys";

export const getEpisodeSourcesOptions = (embedUrl: string) => ({
  queryKey: watchKeys.episodeSources(embedUrl),
  queryFn: () => client.getEpisodeSources(embedUrl),
  enabled: !!embedUrl, // Only fetch if embedUrl is provided
});
