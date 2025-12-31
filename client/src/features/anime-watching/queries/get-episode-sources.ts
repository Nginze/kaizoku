import { client } from "@/lib/api";
import { watchKeys } from "@/lib/query-keys";

export const getEpisodeSourcesOptions = (
  serverId: string,
  episodeNumber: number | string
) => ({
  queryKey: watchKeys.episodeSources(serverId, episodeNumber),
  queryFn: () => client.getEpisodeSources(serverId),
  enabled: !!serverId, // Only fetch if serverId is provided
});
